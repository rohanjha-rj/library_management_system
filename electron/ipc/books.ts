import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerBookHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('books:getAll', async (_event, params = {}) => {
    let query = `
      SELECT b.*, c.name as category_name,
             (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.is_available = 1) as available_copies_live
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `
    const args: any[] = []
    if (params.search) {
      query += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.publisher LIKE ?)`
      const s = `%${params.search}%`
      args.push(s, s, s, s)
    }
    if (params.category_id) { query += ` AND b.category_id = ?`; args.push(params.category_id) }
    if (params.availability === 'available') { query += ` AND b.available_copies > 0` }
    if (params.availability === 'unavailable') { query += ` AND b.available_copies = 0` }

    const countQuery = `SELECT COUNT(*) as total FROM (${query})`
    const total = (db.prepare(countQuery).get(...args) as any).total

    const page = params.page || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit
    query += ` ORDER BY b.title LIMIT ? OFFSET ?`
    args.push(limit, offset)

    const books = db.prepare(query).all(...args)
    return { books, total, page, limit }
  })

  ipcMain.handle('books:getOne', async (_event, id) => {
    const book = db.prepare(`
      SELECT b.*, c.name as category_name
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(id)
    return book
  })

  ipcMain.handle('books:create', async (_event, data) => {
    if (data.isbn) {
      const existing = db.prepare('SELECT id FROM books WHERE isbn = ?').get(data.isbn)
      if (existing) return { success: false, error: 'A book with this ISBN already exists' }
    }
    const r = db.prepare(`
      INSERT INTO books (title, isbn, author, publisher, edition, publication_year, category_id, language, shelf_number, total_copies, available_copies, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title, data.isbn || null, data.author, data.publisher || null, data.edition || null,
      data.publication_year || null, data.category_id || null, data.language || 'English',
      data.shelf_number || null, data.total_copies || 1, data.total_copies || 1,
      data.description || null
    )
    const bookId = r.lastInsertRowid as number
    for (let i = 1; i <= (data.total_copies || 1); i++) {
      const accNum = `ACC${String(bookId).padStart(4, '0')}${String(i).padStart(2, '0')}`
      db.prepare(`INSERT OR IGNORE INTO book_copies (book_id, accession_number) VALUES (?, ?)`).run(bookId, accNum)
    }
    return { success: true, id: bookId }
  })

  ipcMain.handle('books:update', async (_event, data) => {
    if (data.isbn) {
      const existing = db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(data.isbn, data.id)
      if (existing) return { success: false, error: 'Another book with this ISBN already exists' }
    }
    db.prepare(`
      UPDATE books SET title=?, isbn=?, author=?, publisher=?, edition=?, publication_year=?,
      category_id=?, language=?, shelf_number=?, description=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      data.title, data.isbn || null, data.author, data.publisher || null, data.edition || null,
      data.publication_year || null, data.category_id || null, data.language || 'English',
      data.shelf_number || null, data.description || null, data.id
    )
    return { success: true }
  })

  ipcMain.handle('books:delete', async (_event, id) => {
    const activeLoans = db.prepare(`
      SELECT COUNT(*) as cnt FROM issue_transactions WHERE book_id = ? AND status IN ('active','overdue')
    `).get(id) as any
    if (activeLoans.cnt > 0) {
      return { success: false, error: 'Cannot delete book with active loans' }
    }
    db.prepare('DELETE FROM books WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('books:getCategories', async () => {
    return db.prepare('SELECT * FROM categories ORDER BY name').all()
  })

  ipcMain.handle('books:createCategory', async (_event, name) => {
    const r = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(name)
    return { success: true, id: r.lastInsertRowid }
  })

  ipcMain.handle('books:getCopies', async (_event, bookId) => {
    return db.prepare(`
      SELECT bc.*, 
        CASE WHEN it.id IS NOT NULL THEN m.full_name ELSE NULL END as borrowed_by,
        CASE WHEN it.id IS NOT NULL THEN it.due_date ELSE NULL END as due_date,
        CASE WHEN it.id IS NOT NULL THEN m.member_id ELSE NULL END as member_code
      FROM book_copies bc
      LEFT JOIN issue_transactions it ON it.book_copy_id = bc.id AND it.status IN ('active','overdue')
      LEFT JOIN members m ON it.member_id = m.id
      WHERE bc.book_id = ?
      ORDER BY bc.accession_number
    `).all(bookId)
  })

  ipcMain.handle('books:getHistory', async (_event, bookId) => {
    return db.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, bc.accession_number,
             rt.return_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      LEFT JOIN return_transactions rt ON rt.issue_id = it.id
      WHERE it.book_id = ?
      ORDER BY it.created_at DESC
      LIMIT 50
    `).all(bookId)
  })
}
