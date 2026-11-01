import { IpcMain } from 'electron'
import oracledb from 'oracledb'
import { getConnection } from '../database/oracle-init'

async function q<T = any>(sql: string, binds: any[] | object = []): Promise<T[]> {
  const conn = await getConnection()
  try {
    const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    return (r.rows || []) as T[]
  } finally { await conn.close() }
}
function n(row: any): any {
  if (!row) return row
  const out: any = {}
  for (const k of Object.keys(row)) out[k.toLowerCase()] = row[k]
  return out
}

export function registerCirculationHandlers(ipcMain: IpcMain) {
  ipcMain.handle('circulation:issue', async (_e, data) => {
    const conn = await getConnection()
    try {
      // Validate member
      const mRows = await conn.execute(`
        SELECT m.*, mt.max_books, mt.loan_days
        FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
        WHERE m.id = :1
      `, [data.member_id], { outFormat: oracledb.OUT_FORMAT_OBJECT })
      const member = (mRows.rows || [])[0] as any
      if (!member) return { success: false, error: 'Member not found' }
      if (member.STATUS !== 'active') return { success: false, error: `Member account is ${member.STATUS}` }

      const today = new Date().toISOString().split('T')[0]
      if (member.MEMBERSHIP_EXPIRY) {
        const exp = member.MEMBERSHIP_EXPIRY instanceof Date
          ? member.MEMBERSHIP_EXPIRY.toISOString().split('T')[0]
          : String(member.MEMBERSHIP_EXPIRY).split('T')[0]
        if (exp < today) return { success: false, error: "Member's membership has expired" }
      }

      // Active loan count
      const cntRows = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM issue_transactions WHERE member_id=:1 AND status IN ('active','overdue')`,
        [data.member_id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
      const activeCount = ((cntRows.rows || [])[0] as any).CNT
      const maxBooks = member.MAX_BOOKS || 3
      if (activeCount >= maxBooks)
        return { success: false, error: `Member has reached the maximum borrowing limit of ${maxBooks} books` }

      // Validate copy
      const copyRows = await conn.execute(
        `SELECT bc.*, b.title, b.author FROM book_copies bc JOIN books b ON bc.book_id = b.id WHERE bc.id = :1`,
        [data.book_copy_id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
      const copy = ((copyRows.rows || [])[0]) as any
      if (!copy) return { success: false, error: 'Book copy not found' }
      if (!copy.IS_AVAILABLE) return { success: false, error: 'This book copy is not available' }

      // Pending fines
      const fineRows = await conn.execute(
        `SELECT NVL(SUM(amount), 0) AS TOTAL FROM fine_records WHERE member_id=:1 AND status='pending'`,
        [data.member_id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
      const pendingFines = ((fineRows.rows || [])[0] as any).TOTAL || 0

      const loanDays = member.LOAN_DAYS || 14
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + loanDays)
      const dueDateStr = dueDate.toISOString().split('T')[0]

      await conn.execute(`
        INSERT INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
        VALUES (:1, :2, :3, :4, TRUNC(SYSDATE), TO_DATE(:5,'YYYY-MM-DD'), 'active')
      `, [data.member_id, data.book_copy_id, copy.BOOK_ID, data.issued_by, dueDateStr])

      // Get new issue id
      const issueRows = await conn.execute(
        `SELECT id FROM issue_transactions WHERE member_id=:1 AND book_copy_id=:2 AND status='active' ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
        [data.member_id, data.book_copy_id], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
      const issueId = ((issueRows.rows || [])[0] as any)?.ID

      await conn.execute(`UPDATE book_copies SET is_available = 0 WHERE id = :1`, [data.book_copy_id])
      await conn.execute(`UPDATE books SET available_copies = available_copies - 1 WHERE id = :1`, [copy.BOOK_ID])

      if (issueId) {
        await conn.execute(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (:1, 'ISSUE_BOOK', 'issue_transaction', :2, :3)
        `, [data.issued_by, issueId, JSON.stringify({ member_id: data.member_id, book_copy_id: data.book_copy_id })])
      }

      await conn.commit()
      return { success: true, id: issueId, dueDate: dueDateStr, bookTitle: copy.TITLE, pendingFines }
    } catch (err: any) {
      await conn.rollback()
      return { success: false, error: err.message }
    } finally {
      await conn.close()
    }
  })

  ipcMain.handle('circulation:return', async (_e, data) => {
    const conn = await getConnection()
    try {
      const issueRows = await conn.execute(`
        SELECT it.*, bc.book_id, bc.accession_number, b.title
        FROM issue_transactions it
        JOIN book_copies bc ON it.book_copy_id = bc.id
        JOIN books b ON it.book_id = b.id
        WHERE it.id = :1 AND it.status IN ('active','overdue')
      `, [data.issue_id], { outFormat: oracledb.OUT_FORMAT_OBJECT })
      const issue = ((issueRows.rows || [])[0]) as any
      if (!issue) return { success: false, error: 'Loan record not found or already returned' }

      const today = new Date()
      const dueDate = issue.DUE_DATE instanceof Date ? issue.DUE_DATE : new Date(issue.DUE_DATE)
      const overdueDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000))

      const settRows = await conn.execute(
        `SELECT value FROM library_settings WHERE key_name = 'fine_per_day'`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
      const finePerDay = parseFloat(((settRows.rows || [])[0] as any)?.VALUE || '2.00')
      const fineAmount = overdueDays * finePerDay

      await conn.execute(`UPDATE issue_transactions SET status='returned' WHERE id=:1`, [issue.ID])
      await conn.execute(`UPDATE book_copies SET is_available=1 WHERE id=:1`, [issue.BOOK_COPY_ID])
      await conn.execute(`UPDATE books SET available_copies=available_copies+1 WHERE id=:1`, [issue.BOOK_ID])

      await conn.execute(`
        INSERT INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days, condition, notes)
        VALUES (:1, :2, :3, :4, :5, TRUNC(SYSDATE), :6, :7, :8)
      `, [issue.ID, issue.MEMBER_ID, issue.BOOK_COPY_ID, issue.BOOK_ID, data.returned_by, overdueDays, data.condition || 'Good', data.notes || null])

      let fineId = null
      if (fineAmount > 0) {
        const exFine = await conn.execute(
          `SELECT id FROM fine_records WHERE issue_id=:1`, [issue.ID], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
        const existing = ((exFine.rows || [])[0]) as any
        if (!existing) {
          await conn.execute(
            `INSERT INTO fine_records (issue_id, member_id, amount, overdue_days) VALUES (:1, :2, :3, :4)`,
            [issue.ID, issue.MEMBER_ID, fineAmount, overdueDays]
          )
          const fr = await conn.execute(
            `SELECT id FROM fine_records WHERE issue_id=:1 ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
            [issue.ID], { outFormat: oracledb.OUT_FORMAT_OBJECT }
          )
          fineId = ((fr.rows || [])[0] as any)?.ID
        } else {
          await conn.execute(
            `UPDATE fine_records SET amount=:1, overdue_days=:2, updated_at=SYSTIMESTAMP WHERE id=:3`,
            [fineAmount, overdueDays, existing.ID]
          )
          fineId = existing.ID
        }
      }

      await conn.commit()
      return { success: true, overdueDays, fineAmount, fineId, bookTitle: issue.TITLE }
    } catch (err: any) {
      await conn.rollback()
      return { success: false, error: err.message }
    } finally {
      await conn.close()
    }
  })

  ipcMain.handle('circulation:getActiveLoans', async (_e, params: any = {}) => {
    let where = `WHERE it.status IN ('active','overdue')`
    const binds: any[] = []
    let bi = 1

    if (params.search) {
      const s = `%${params.search}%`
      where += ` AND (UPPER(m.full_name) LIKE UPPER(:${bi}) OR m.member_id LIKE :${bi+1} OR UPPER(b.title) LIKE UPPER(:${bi+2}) OR bc.accession_number LIKE :${bi+3})`
      binds.push(s, s, s, s); bi += 4
    }
    if (params.overdue_only) where += ` AND TRUNC(SYSDATE) > it.due_date`

    const countRows = await q(
      `SELECT COUNT(*) AS CNT FROM issue_transactions it
       JOIN members m ON it.member_id=m.id
       JOIN books b ON it.book_id=b.id
       JOIN book_copies bc ON it.book_copy_id=bc.id ${where}`, binds
    )
    const total = (countRows[0] as any).CNT
    const page  = params.page  || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    const rows = await q(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, m.department,
             b.title, b.author, bc.accession_number,
             GREATEST(0, TRUNC(SYSDATE) - it.due_date) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      ${where}
      ORDER BY it.due_date ASC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit])

    return { loans: rows.map(n), total, page, limit }
  })

  ipcMain.handle('circulation:getLoanById', async (_e, id) => {
    const rows = await q(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, m.department,
             b.title, b.author, bc.accession_number,
             GREATEST(0, TRUNC(SYSDATE) - it.due_date) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.id = :1
    `, [id])
    return rows.length ? n(rows[0]) : null
  })

  ipcMain.handle('circulation:searchLoans', async (_e, search) => {
    const s = `%${search}%`
    const rows = await q(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code,
             b.title, b.author, bc.accession_number,
             GREATEST(0, TRUNC(SYSDATE) - it.due_date) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
        AND (UPPER(m.full_name) LIKE UPPER(:1) OR m.member_id LIKE :2 OR UPPER(b.title) LIKE UPPER(:3) OR bc.accession_number LIKE :4)
      ORDER BY it.due_date ASC
      FETCH FIRST 20 ROWS ONLY
    `, [s, s, s, s])
    return rows.map(n)
  })

  ipcMain.handle('circulation:renew', async (_e, id) => {
    const rows = await q(`SELECT * FROM issue_transactions WHERE id=:1 AND status='active'`, [id])
    const loan = rows[0] as any
    if (!loan) return { success: false, error: 'Active loan not found' }

    const settings = await q(`SELECT key_name, value FROM library_settings WHERE key_name IN ('renewal_limit','renewal_days')`)
    const sMap: any = {}
    for (const s of settings) sMap[(s as any).KEY_NAME] = (s as any).VALUE
    const renewalLimit = parseInt(sMap['renewal_limit'] || '2')
    const renewalDays  = parseInt(sMap['renewal_days'] || '7')

    if (loan.RENEWAL_COUNT >= renewalLimit)
      return { success: false, error: `Renewal limit of ${renewalLimit} reached` }

    const dueDate = loan.DUE_DATE instanceof Date ? loan.DUE_DATE : new Date(loan.DUE_DATE)
    dueDate.setDate(dueDate.getDate() + renewalDays)
    const newDue = dueDate.toISOString().split('T')[0]

    const conn = await getConnection()
    try {
      await conn.execute(
        `UPDATE issue_transactions SET due_date=TO_DATE(:1,'YYYY-MM-DD'), renewal_count=renewal_count+1 WHERE id=:2`,
        [newDue, id], { autoCommit: true }
      )
    } finally { await conn.close() }

    return { success: true, newDueDate: newDue }
  })
}

