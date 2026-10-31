import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerReportHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('reports:dashboardStats', async () => {
    const totalBooks = (db.prepare('SELECT COUNT(*) as cnt FROM books').get() as any).cnt
    const totalCopies = (db.prepare('SELECT COUNT(*) as cnt FROM book_copies').get() as any).cnt
    const availableCopies = (db.prepare("SELECT COUNT(*) as cnt FROM book_copies WHERE is_available = 1").get() as any).cnt
    const issuedCopies = (db.prepare("SELECT COUNT(*) as cnt FROM issue_transactions WHERE status IN ('active','overdue')").get() as any).cnt
    const overdueCount = (db.prepare("SELECT COUNT(*) as cnt FROM issue_transactions WHERE status = 'overdue' OR (status = 'active' AND due_date < date('now'))").get() as any).cnt
    const totalMembers = (db.prepare("SELECT COUNT(*) as cnt FROM members WHERE status = 'active'").get() as any).cnt
    const issuedToday = (db.prepare("SELECT COUNT(*) as cnt FROM issue_transactions WHERE issue_date = date('now')").get() as any).cnt
    const pendingFines = (db.prepare("SELECT COUNT(*) as cnt FROM fine_records WHERE status = 'pending'").get() as any).cnt
    const totalFineAmount = (db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM fine_records WHERE status = 'pending'").get() as any).total

    return { totalBooks, totalCopies, availableCopies, issuedCopies, overdueCount, totalMembers, issuedToday, pendingFines, totalFineAmount }
  })

  ipcMain.handle('reports:recentTransactions', async () => {
    return db.prepare(`
      SELECT it.id, 'issue' as type, m.full_name as member_name, m.member_id as member_code,
             b.title as book_title, it.issue_date as date, it.due_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      ORDER BY it.created_at DESC LIMIT 10
    `).all()
  })

  ipcMain.handle('reports:overdueBooks', async () => {
    return db.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, m.phone,
             b.title, b.author, bc.accession_number,
             CAST(julianday('now') - julianday(it.due_date) AS INTEGER) as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue') AND it.due_date < date('now')
      ORDER BY it.due_date ASC
      LIMIT 50
    `).all()
  })

  ipcMain.handle('reports:upcomingDues', async () => {
    return db.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code,
             b.title, bc.accession_number,
             CAST(julianday(it.due_date) - julianday('now') AS INTEGER) as days_remaining
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status = 'active' AND it.due_date >= date('now') AND it.due_date <= date('now', '+7 days')
      ORDER BY it.due_date ASC
      LIMIT 20
    `).all()
  })

  ipcMain.handle('reports:mostBorrowed', async () => {
    return db.prepare(`
      SELECT b.id, b.title, b.author, c.name as category_name,
             COUNT(it.id) as borrow_count
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      GROUP BY b.id
      ORDER BY borrow_count DESC
      LIMIT 10
    `).all()
  })

  ipcMain.handle('reports:monthlyStats', async () => {
    return db.prepare(`
      SELECT strftime('%Y-%m', issue_date) as month,
             COUNT(*) as issued,
             SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned
      FROM issue_transactions
      WHERE issue_date >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `).all()
  })

  ipcMain.handle('reports:inventory', async (_event, params = {}) => {
    let query = `
      SELECT b.*, c.name as category_name,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as copy_count,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.is_available = 1) as avail_count
      FROM books b LEFT JOIN categories c ON b.category_id = c.id WHERE 1=1
    `
    const args: any[] = []
    if (params.search) {
      query += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)`
      const s = `%${params.search}%`
      args.push(s, s, s)
    }
    if (params.category_id) { query += ` AND b.category_id = ?`; args.push(params.category_id) }
    query += ` ORDER BY b.title`
    return db.prepare(query).all(...args)
  })

  ipcMain.handle('reports:issued', async (_event, params = {}) => {
    let query = `
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, m.department,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
    `
    const args: any[] = []
    if (params.from_date) { query += ` AND it.issue_date >= ?`; args.push(params.from_date) }
    if (params.to_date) { query += ` AND it.issue_date <= ?`; args.push(params.to_date) }
    query += ` ORDER BY it.issue_date DESC`
    return db.prepare(query).all(...args)
  })

  ipcMain.handle('reports:returns', async (_event, params = {}) => {
    let query = `
      SELECT rt.*, m.full_name as member_name, m.member_id as member_code,
             b.title, b.author, bc.accession_number, it.issue_date, it.due_date
      FROM return_transactions rt
      JOIN members m ON rt.member_id = m.id
      JOIN books b ON rt.book_id = b.id
      JOIN book_copies bc ON rt.book_copy_id = bc.id
      JOIN issue_transactions it ON rt.issue_id = it.id
      WHERE 1=1
    `
    const args: any[] = []
    if (params.from_date) { query += ` AND rt.return_date >= ?`; args.push(params.from_date) }
    if (params.to_date) { query += ` AND rt.return_date <= ?`; args.push(params.to_date) }
    query += ` ORDER BY rt.return_date DESC`
    return db.prepare(query).all(...args)
  })

  ipcMain.handle('reports:fines', async (_event, params = {}) => {
    let query = `
      SELECT fr.*, m.full_name as member_name, m.member_id as member_code,
             b.title, it.issue_date, it.due_date
      FROM fine_records fr
      JOIN members m ON fr.member_id = m.id
      JOIN issue_transactions it ON fr.issue_id = it.id
      JOIN books b ON it.book_id = b.id
      WHERE 1=1
    `
    const args: any[] = []
    if (params.status) { query += ` AND fr.status = ?`; args.push(params.status) }
    if (params.from_date) { query += ` AND fr.created_at >= ?`; args.push(params.from_date) }
    if (params.to_date) { query += ` AND fr.created_at <= ?`; args.push(params.to_date) }
    query += ` ORDER BY fr.created_at DESC`
    return db.prepare(query).all(...args)
  })

  ipcMain.handle('reports:members', async (_event, params = {}) => {
    let query = `
      SELECT m.*, mt.name as membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id) as total_borrows,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) as active_loans,
        (SELECT COALESCE(SUM(fr.amount),0) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') as pending_fines
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id WHERE 1=1
    `
    const args: any[] = []
    if (params.status) { query += ` AND m.status = ?`; args.push(params.status) }
    query += ` ORDER BY m.full_name`
    return db.prepare(query).all(...args)
  })

  ipcMain.handle('reports:export', async (_event, data) => {
    // Returns CSV string for renderer to download
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
