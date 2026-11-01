import { IpcMain } from 'electron'
import oracledb from 'oracledb'
import { getConnection } from '../database/oracle-init'

async function q<T = any>(sql: string, binds: any[] | object = []): Promise<T[]> {
  const conn = await getConnection()
  try {
    const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    return (r.rows || []) as T[]
  } finally {
    await conn.close()
  }
}

function n(row: any): any {
  if (!row) return row
  const out: any = {}
  for (const k of Object.keys(row)) {
    let val = row[k]
    if (val instanceof Date) {
      val = val.toISOString().split('T')[0]
    }
    out[k.toLowerCase()] = val
  }
  return out
}

export function registerReportHandlers(ipcMain: IpcMain) {
  ipcMain.handle('reports:dashboardStats', async () => {
    const b = await q(`SELECT COUNT(*) AS CNT FROM books`)
    const c = await q(`SELECT COUNT(*) AS CNT FROM book_copies`)
    const a = await q(`SELECT COUNT(*) AS CNT FROM book_copies WHERE is_available = 1`)
    const i = await q(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE status IN ('active','overdue')`)
    const o = await q(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE status = 'overdue' OR (status = 'active' AND due_date < TRUNC(SYSDATE))`)
    const m = await q(`SELECT COUNT(*) AS CNT FROM members WHERE status = 'active'`)
    const t = await q(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE issue_date = TRUNC(SYSDATE)`)
    const pf = await q(`SELECT COUNT(*) AS CNT FROM fine_records WHERE status = 'pending'`)
    const tfa = await q(`SELECT NVL(SUM(amount), 0) AS TOTAL FROM fine_records WHERE status = 'pending'`)

    return {
      totalBooks: (b[0] as any)?.CNT || 0,
      totalCopies: (c[0] as any)?.CNT || 0,
      availableCopies: (a[0] as any)?.CNT || 0,
      issuedCopies: (i[0] as any)?.CNT || 0,
      overdueCount: (o[0] as any)?.CNT || 0,
      totalMembers: (m[0] as any)?.CNT || 0,
      issuedToday: (t[0] as any)?.CNT || 0,
      pendingFines: (pf[0] as any)?.CNT || 0,
      totalFineAmount: (tfa[0] as any)?.TOTAL || 0,
    }
  })

  ipcMain.handle('reports:recentTransactions', async () => {
    const rows = await q(`
      SELECT it.id, 'issue' AS type, m.full_name AS member_name, m.member_id AS member_code,
             b.title AS book_title, TO_CHAR(it.issue_date, 'YYYY-MM-DD') AS "DATE",
             TO_CHAR(it.due_date, 'YYYY-MM-DD') AS due_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      ORDER BY it.created_at DESC
      FETCH FIRST 10 ROWS ONLY
    `)
    return rows.map(n)
  })

  ipcMain.handle('reports:overdueBooks', async () => {
    const rows = await q(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, m.phone,
             b.title, b.author, bc.accession_number,
             ROUND(TRUNC(SYSDATE) - it.due_date) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue') AND it.due_date < TRUNC(SYSDATE)
      ORDER BY it.due_date ASC
      FETCH FIRST 50 ROWS ONLY
    `)
    return rows.map(n)
  })

  ipcMain.handle('reports:upcomingDues', async () => {
    const rows = await q(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code,
             b.title, bc.accession_number,
             ROUND(it.due_date - TRUNC(SYSDATE)) AS days_remaining
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status = 'active' AND it.due_date >= TRUNC(SYSDATE) AND it.due_date <= TRUNC(SYSDATE) + 7
      ORDER BY it.due_date ASC
      FETCH FIRST 20 ROWS ONLY
    `)
    return rows.map(n)
  })

  ipcMain.handle('reports:mostBorrowed', async () => {
    const rows = await q(`
      SELECT b.id, b.title, b.author, c.name AS category_name,
             COUNT(it.id) AS borrow_count
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      GROUP BY b.id, b.title, b.author, c.name
      ORDER BY borrow_count DESC
      FETCH FIRST 10 ROWS ONLY
    `)
    return rows.map(n)
  })

  ipcMain.handle('reports:monthlyStats', async () => {
    const rows = await q(`
      SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month,
             COUNT(*) AS issued,
             SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned
      FROM issue_transactions
      WHERE issue_date >= ADD_MONTHS(TRUNC(SYSDATE), -12)
      GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
      ORDER BY month ASC
    `)
    return rows.map(n)
  })

  ipcMain.handle('reports:inventory', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bi = 1

    if (params.search) {
      const s = `%${params.search}%`
      where += ` AND (UPPER(b.title) LIKE UPPER(:${bi}) OR UPPER(b.author) LIKE UPPER(:${bi+1}) OR b.isbn LIKE :${bi+2})`
      binds.push(s, s, s); bi += 3
    }
    if (params.category_id) {
      where += ` AND b.category_id = :${bi}`
      binds.push(params.category_id); bi++
    }

    const rows = await q(`
      SELECT b.*, c.name AS category_name,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) AS copy_count,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.is_available = 1) AS avail_count
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ${where}
      ORDER BY b.title
    `, binds)
    return rows.map(n)
  })

  ipcMain.handle('reports:issued', async (_e, params: any = {}) => {
    let where = `WHERE it.status IN ('active','overdue')`
    const binds: any[] = []
    let bi = 1

    if (params.from_date) {
      where += ` AND it.issue_date >= TO_DATE(:${bi}, 'YYYY-MM-DD')`
      binds.push(params.from_date); bi++
    }
    if (params.to_date) {
      where += ` AND it.issue_date <= TO_DATE(:${bi}, 'YYYY-MM-DD')`
      binds.push(params.to_date); bi++
    }

    const rows = await q(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, m.department,
             b.title, b.author, bc.accession_number,
             GREATEST(0, ROUND(TRUNC(SYSDATE) - it.due_date)) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      ${where}
      ORDER BY it.issue_date DESC
    `, binds)
    return rows.map(n)
  })

  ipcMain.handle('reports:returns', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bi = 1

    if (params.from_date) {
      where += ` AND rt.return_date >= TO_DATE(:${bi}, 'YYYY-MM-DD')`
      binds.push(params.from_date); bi++
    }
    if (params.to_date) {
      where += ` AND rt.return_date <= TO_DATE(:${bi}, 'YYYY-MM-DD')`
      binds.push(params.to_date); bi++
    }

    const rows = await q(`
      SELECT rt.*, m.full_name AS member_name, m.member_id AS member_code,
             b.title, b.author, bc.accession_number,
             TO_CHAR(it.issue_date, 'YYYY-MM-DD') AS issue_date,
             TO_CHAR(it.due_date, 'YYYY-MM-DD') AS due_date
      FROM return_transactions rt
      JOIN members m ON rt.member_id = m.id
      JOIN books b ON rt.book_id = b.id
      JOIN book_copies bc ON rt.book_copy_id = bc.id
      JOIN issue_transactions it ON rt.issue_id = it.id
      ${where}
      ORDER BY rt.return_date DESC
    `, binds)
    return rows.map(n)
  })

  ipcMain.handle('reports:fines', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bi = 1

    if (params.status) {
      where += ` AND fr.status = :${bi}`
      binds.push(params.status); bi++
    }
    if (params.from_date) {
      where += ` AND fr.created_at >= TO_TIMESTAMP(:${bi}, 'YYYY-MM-DD')`
      binds.push(params.from_date); bi++
    }
    if (params.to_date) {
      where += ` AND fr.created_at <= TO_TIMESTAMP(:${bi} || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`
      binds.push(params.to_date); bi++
    }

    const rows = await q(`
      SELECT fr.*, m.full_name AS member_name, m.member_id AS member_code,
             b.title,
             TO_CHAR(it.issue_date, 'YYYY-MM-DD') AS issue_date,
             TO_CHAR(it.due_date, 'YYYY-MM-DD') AS due_date
      FROM fine_records fr
      JOIN members m ON fr.member_id = m.id
      JOIN issue_transactions it ON fr.issue_id = it.id
      JOIN books b ON it.book_id = b.id
      ${where}
      ORDER BY fr.created_at DESC
    `, binds)
    return rows.map(n)
  })

  ipcMain.handle('reports:members', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bi = 1

    if (params.status) {
      where += ` AND m.status = :${bi}`
      binds.push(params.status); bi++
    }

    const rows = await q(`
      SELECT m.*, mt.name AS membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id) AS total_borrows,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) AS active_loans,
        (SELECT NVL(SUM(fr.amount),0) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') AS pending_fines
      FROM members m
      LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      ${where}
      ORDER BY m.full_name
    `, binds)
    return rows.map(n)
  })

  ipcMain.handle('reports:export', async (_e, data) => {
    const rows = data.rows as any[]
    if (!rows || rows.length === 0) return { success: false, error: 'No data to export' }
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
    ].join('\n')
    return { success: true, csv }
  })
}

