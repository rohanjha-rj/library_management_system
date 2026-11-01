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
async function x(sql: string, binds: any[] | object = []) {
  const conn = await getConnection()
  try {
    return await conn.execute(sql, binds, { autoCommit: true })
  } finally { await conn.close() }
}
function n(row: any): any {
  if (!row) return row
  const out: any = {}
  for (const k of Object.keys(row)) out[k.toLowerCase()] = row[k]
  return out
}

export function registerMemberHandlers(ipcMain: IpcMain) {
  ipcMain.handle('members:getAll', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bi = 1

    if (params.search) {
      const s = `%${params.search}%`
      where += ` AND (UPPER(m.full_name) LIKE UPPER(:${bi}) OR m.member_id LIKE :${bi+1} OR m.registration_number LIKE :${bi+2} OR m.email LIKE :${bi+3} OR m.phone LIKE :${bi+4})`
      binds.push(s, s, s, s, s); bi += 5
    }
    if (params.status)             { where += ` AND m.status = :${bi}`;              binds.push(params.status); bi++ }
    if (params.membership_type_id) { where += ` AND m.membership_type_id = :${bi}`;  binds.push(params.membership_type_id); bi++ }
    if (params.department)         { where += ` AND UPPER(m.department) LIKE UPPER(:${bi})`; binds.push(`%${params.department}%`); bi++ }

    const countRows = await q(
      `SELECT COUNT(*) AS TOTAL FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id ${where}`,
      binds
    )
    const total = (countRows[0] as any).TOTAL
    const page  = params.page  || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    const rows = await q(`
      SELECT m.*, mt.name AS membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) AS active_loans,
        (SELECT COUNT(*) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') AS pending_fines
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      ${where}
      ORDER BY m.full_name
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit])

    return { members: rows.map(n), total, page, limit }
  })

  ipcMain.handle('members:getOne', async (_e, id) => {
    const rows = await q(`
      SELECT m.*, mt.name AS membership_type_name, mt.max_books, mt.loan_days
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      WHERE m.id = :1
    `, [id])
    return rows.length ? n(rows[0]) : null
  })

  ipcMain.handle('members:create', async (_e, data) => {
    const ex = await q(`SELECT id FROM members WHERE member_id = :1`, [data.member_id])
    if (ex.length) return { success: false, error: 'Member ID already exists' }

    await x(`
      INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone,
        membership_type_id, membership_start, membership_expiry, status, notes)
      VALUES (:1, :2, :3, :4, :5, :6, :7, :8,
        ${data.membership_start ? `TO_DATE(:9,'YYYY-MM-DD')` : 'NULL'},
        ${data.membership_expiry ? `TO_DATE(:10,'YYYY-MM-DD')` : 'NULL'},
        :11, :12)
    `, [
      data.member_id, data.full_name, data.registration_number || null, data.department || null,
      data.course || null, data.email || null, data.phone || null, data.membership_type_id || null,
      ...(data.membership_start ? [data.membership_start] : []),
      ...(data.membership_expiry ? [data.membership_expiry] : []),
      data.status || 'active', data.notes || null,
    ])

    // Simpler insert without conditional dates
    await x(`DELETE FROM members WHERE member_id = :1`, [data.member_id])
    await x(`
      INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone,
        membership_type_id, membership_start, membership_expiry, status, notes)
      VALUES (:1, :2, :3, :4, :5, :6, :7, :8, 
        TO_DATE(NULLIF(:9,''), 'YYYY-MM-DD'), TO_DATE(NULLIF(:10,''), 'YYYY-MM-DD'),
        :11, :12)
    `, [
      data.member_id, data.full_name, data.registration_number || null, data.department || null,
      data.course || null, data.email || null, data.phone || null, data.membership_type_id || null,
      data.membership_start || '', data.membership_expiry || '',
      data.status || 'active', data.notes || null,
    ])
    const rows = await q(`SELECT id FROM members WHERE member_id = :1`, [data.member_id])
    return { success: true, id: rows[0]?.ID }
  })

  ipcMain.handle('members:update', async (_e, data) => {
    await x(`
      UPDATE members SET full_name=:1, registration_number=:2, department=:3, course=:4,
        email=:5, phone=:6, membership_type_id=:7,
        membership_start=TO_DATE(NULLIF(:8,''),'YYYY-MM-DD'),
        membership_expiry=TO_DATE(NULLIF(:9,''),'YYYY-MM-DD'),
        status=:10, notes=:11, updated_at=SYSTIMESTAMP
      WHERE id=:12
    `, [
      data.full_name, data.registration_number || null, data.department || null, data.course || null,
      data.email || null, data.phone || null, data.membership_type_id || null,
      data.membership_start || '', data.membership_expiry || '',
      data.status, data.notes || null, data.id,
    ])
    return { success: true }
  })

  ipcMain.handle('members:delete', async (_e, id) => {
    const active = await q(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE member_id=:1 AND status IN ('active','overdue')`, [id])
    if ((active[0] as any).CNT > 0) return { success: false, error: 'Cannot delete member with active loans' }
    await x(`UPDATE members SET status='deactivated' WHERE id=:1`, [id])
    return { success: true }
  })

  ipcMain.handle('members:getMembershipTypes', async () => {
    const rows = await q(`SELECT * FROM membership_types ORDER BY name`)
    return rows.map(n)
  })

  ipcMain.handle('members:getHistory', async (_e, memberId) => {
    const rows = await q(`
      SELECT it.*, b.title AS book_title, b.author, bc.accession_number,
             TO_CHAR(rt.return_date,'YYYY-MM-DD') AS return_date,
             fr.amount AS fine_amount, fr.status AS fine_status
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      LEFT JOIN return_transactions rt ON rt.issue_id = it.id
      LEFT JOIN fine_records fr ON fr.issue_id = it.id
      WHERE it.member_id = :1
      ORDER BY it.created_at DESC
      FETCH FIRST 50 ROWS ONLY
    `, [memberId])
    return rows.map(n)
  })

  ipcMain.handle('members:getActiveLoans', async (_e, memberId) => {
    const rows = await q(`
      SELECT it.*, b.title, b.author, bc.accession_number
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.member_id = :1 AND it.status IN ('active','overdue')
    `, [memberId])
    return rows.map(n)
  })
}

