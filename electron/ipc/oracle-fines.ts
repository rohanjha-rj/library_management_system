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

export function registerFineHandlers(ipcMain: IpcMain) {
  ipcMain.handle('fines:getAll', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bi = 1

    if (params.status)    { where += ` AND fr.status = :${bi}`;      binds.push(params.status); bi++ }
    if (params.member_id) { where += ` AND fr.member_id = :${bi}`;   binds.push(params.member_id); bi++ }
    if (params.search) {
      const s = `%${params.search}%`
      where += ` AND (UPPER(m.full_name) LIKE UPPER(:${bi}) OR m.member_id LIKE :${bi+1} OR UPPER(b.title) LIKE UPPER(:${bi+2}))`
      binds.push(s, s, s); bi += 3
    }

    const base = `
      FROM fine_records fr
      JOIN members m ON fr.member_id = m.id
      JOIN issue_transactions it ON fr.issue_id = it.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      JOIN books b ON it.book_id = b.id
      LEFT JOIN users u ON fr.waived_by = u.id
      ${where}
    `
    const countRows = await q(`SELECT COUNT(*) AS CNT ${base}`, binds)
    const total = (countRows[0] as any).CNT
    const page  = params.page  || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    const rows = await q(`
      SELECT fr.*, m.full_name AS member_name, m.member_id AS member_code,
             b.title AS book_title, bc.accession_number,
             TO_CHAR(it.issue_date,'YYYY-MM-DD') AS issue_date,
             TO_CHAR(it.due_date,'YYYY-MM-DD') AS due_date,
             u.full_name AS waived_by_name
      ${base}
      ORDER BY fr.created_at DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit])

    return { fines: rows.map(n), total, page, limit }
  })

  ipcMain.handle('fines:pay', async (_e, data) => {
    const rows = await q(`SELECT * FROM fine_records WHERE id=:1`, [data.fine_id])
    const fine = rows[0] as any
    if (!fine) return { success: false, error: 'Fine record not found' }
    if (fine.STATUS !== 'pending') return { success: false, error: 'Fine is already paid or waived' }

    await x(
      `INSERT INTO fine_payments (fine_id, amount, payment_method, received_by, notes) VALUES (:1, :2, :3, :4, :5)`,
      [data.fine_id, fine.AMOUNT, data.payment_method || 'cash', data.received_by, data.notes || null]
    )
    await x(`UPDATE fine_records SET status='paid', updated_at=SYSTIMESTAMP WHERE id=:1`, [data.fine_id])
    return { success: true }
  })

  ipcMain.handle('fines:waive', async (_e, data) => {
    const rows = await q(`SELECT id FROM fine_records WHERE id=:1`, [data.fine_id])
    if (!rows.length) return { success: false, error: 'Fine record not found' }
    await x(
      `UPDATE fine_records SET status='waived', waived_reason=:1, waived_by=:2, updated_at=SYSTIMESTAMP WHERE id=:3`,
      [data.reason, data.waived_by, data.fine_id]
    )
    return { success: true }
  })

  ipcMain.handle('fines:getPolicy', async () => {
    const rows = await q(`SELECT key_name AS key, value FROM library_settings WHERE key_name IN ('fine_per_day','max_loan_days')`)
    return rows.map(n)
  })
}

