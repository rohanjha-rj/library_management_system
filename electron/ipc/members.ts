import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerMemberHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('members:getAll', async (_event, params = {}) => {
    let query = `
      SELECT m.*, mt.name as membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) as active_loans,
        (SELECT COUNT(*) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') as pending_fines
      FROM members m
      LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      WHERE 1=1
    `
    const args: any[] = []
    if (params.search) {
      query += ` AND (m.full_name LIKE ? OR m.member_id LIKE ? OR m.registration_number LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)`
      const s = `%${params.search}%`
      args.push(s, s, s, s, s)
    }
    if (params.status) { query += ` AND m.status = ?`; args.push(params.status) }
    if (params.membership_type_id) { query += ` AND m.membership_type_id = ?`; args.push(params.membership_type_id) }
    if (params.department) { query += ` AND m.department LIKE ?`; args.push(`%${params.department}%`) }

    const total = (db.prepare(`SELECT COUNT(*) as total FROM (${query})`).get(...args) as any).total
    const page = params.page || 1
    const limit = params.limit || 20
    query += ` ORDER BY m.full_name LIMIT ? OFFSET ?`
    args.push(limit, (page - 1) * limit)

    return { members: db.prepare(query).all(...args), total, page, limit }
  })

  ipcMain.handle('members:getOne', async (_event, id) => {
    return db.prepare(`
      SELECT m.*, mt.name as membership_type_name, mt.max_books, mt.loan_days
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      WHERE m.id = ?
    `).get(id)
  })

  ipcMain.handle('members:create', async (_event, data) => {
    const existing = db.prepare('SELECT id FROM members WHERE member_id = ?').get(data.member_id)
    if (existing) return { success: false, error: 'Member ID already exists' }

    const r = db.prepare(`
      INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone, membership_type_id, membership_start, membership_expiry, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.member_id, data.full_name, data.registration_number || null, data.department || null,
      data.course || null, data.email || null, data.phone || null, data.membership_type_id || null,
      data.membership_start || null, data.membership_expiry || null,
      data.status || 'active', data.notes || null
    )
    return { success: true, id: r.lastInsertRowid }
  })

  ipcMain.handle('members:update', async (_event, data) => {
    db.prepare(`
      UPDATE members SET full_name=?, registration_number=?, department=?, course=?, email=?, phone=?,
      membership_type_id=?, membership_start=?, membership_expiry=?, status=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      data.full_name, data.registration_number || null, data.department || null, data.course || null,
      data.email || null, data.phone || null, data.membership_type_id || null,
      data.membership_start || null, data.membership_expiry || null,
      data.status, data.notes || null, data.id
    )
    return { success: true }
  })

  ipcMain.handle('members:delete', async (_event, id) => {
    const activeLoans = db.prepare(`
      SELECT COUNT(*) as cnt FROM issue_transactions WHERE member_id = ? AND status IN ('active','overdue')
    `).get(id) as any
    if (activeLoans.cnt > 0) return { success: false, error: 'Cannot delete member with active loans' }
    db.prepare('UPDATE members SET status = ? WHERE id = ?').run('deactivated', id)
    return { success: true }
  })

  ipcMain.handle('members:getMembershipTypes', async () => {
    return db.prepare('SELECT * FROM membership_types ORDER BY name').all()
  })

  ipcMain.handle('members:getHistory', async (_event, memberId) => {
    return db.prepare(`
      SELECT it.*, b.title as book_title, b.author, bc.accession_number, rt.return_date,
             fr.amount as fine_amount, fr.status as fine_status
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      LEFT JOIN return_transactions rt ON rt.issue_id = it.id
      LEFT JOIN fine_records fr ON fr.issue_id = it.id
      WHERE it.member_id = ?
      ORDER BY it.created_at DESC
      LIMIT 50
    `).all(memberId)
  })

  ipcMain.handle('members:getActiveLoans', async (_event, memberId) => {
    return db.prepare(`
      SELECT it.*, b.title, b.author, bc.accession_number
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.member_id = ? AND it.status IN ('active','overdue')
    `).all(memberId)
  })
}
