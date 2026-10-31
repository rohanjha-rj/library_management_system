import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerFineHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('fines:getAll', async (_event, params = {}) => {
    let query = `
      SELECT fr.*, m.full_name as member_name, m.member_id as member_code,
             b.title as book_title, bc.accession_number,
             it.issue_date, it.due_date,
             u.full_name as waived_by_name
      FROM fine_records fr
      JOIN members m ON fr.member_id = m.id
      JOIN issue_transactions it ON fr.issue_id = it.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      JOIN books b ON it.book_id = b.id
      LEFT JOIN users u ON fr.waived_by = u.id
      WHERE 1=1
    `
    const args: any[] = []
    if (params.status) { query += ` AND fr.status = ?`; args.push(params.status) }
    if (params.member_id) { query += ` AND fr.member_id = ?`; args.push(params.member_id) }
    if (params.search) {
      query += ` AND (m.full_name LIKE ? OR m.member_id LIKE ? OR b.title LIKE ?)`
      const s = `%${params.search}%`
      args.push(s, s, s)
    }

    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM (${query})`).get(...args) as any).cnt
    const page = params.page || 1
    const limit = params.limit || 20
    query += ` ORDER BY fr.created_at DESC LIMIT ? OFFSET ?`
    args.push(limit, (page - 1) * limit)

    return { fines: db.prepare(query).all(...args), total, page, limit }
  })

  ipcMain.handle('fines:pay', async (_event, data) => {
    const fine = db.prepare('SELECT * FROM fine_records WHERE id = ?').get(data.fine_id) as any
    if (!fine) return { success: false, error: 'Fine record not found' }
    if (fine.status !== 'pending') return { success: false, error: 'Fine is already paid or waived' }

    db.prepare(`INSERT INTO fine_payments (fine_id, amount, payment_method, received_by, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(data.fine_id, fine.amount, data.payment_method || 'cash', data.received_by, data.notes || null)
    db.prepare(`UPDATE fine_records SET status = 'paid', updated_at = datetime('now') WHERE id = ?`).run(data.fine_id)
    return { success: true }
  })

  ipcMain.handle('fines:waive', async (_event, data) => {
    const fine = db.prepare('SELECT * FROM fine_records WHERE id = ?').get(data.fine_id) as any
    if (!fine) return { success: false, error: 'Fine record not found' }
    db.prepare(`UPDATE fine_records SET status = 'waived', waived_reason = ?, waived_by = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(data.reason, data.waived_by, data.fine_id)
    return { success: true }
  })

  ipcMain.handle('fines:getPolicy', async () => {
    return db.prepare("SELECT * FROM library_settings WHERE key IN ('fine_per_day','max_loan_days')").all()
  })
}
