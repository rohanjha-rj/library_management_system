import { IpcMain } from 'electron'
import oracledb from 'oracledb'
import { getConnection } from '../database/oracle-init'

async function q<T = any>(sql: string, binds: any[] | object = []): Promise<T[]> {
  const conn = await getConnection()
  try {
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    return (result.rows || []) as T[]
  } finally {
    await conn.close()
  }
}
async function x(sql: string, binds: any[] | object = []): Promise<oracledb.Result<any>> {
  const conn = await getConnection()
  try {
    return await conn.execute(sql, binds, { autoCommit: true })
  } finally {
    await conn.close()
  }
}

export function registerBookHandlers(ipcMain: IpcMain) {
  ipcMain.handle('books:getAll', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bindIdx = 1

    if (params.search) {
      const s = `%${params.search}%`
      where += ` AND (UPPER(b.title) LIKE UPPER(:${bindIdx}) OR UPPER(b.author) LIKE UPPER(:${bindIdx+1}) OR b.isbn LIKE :${bindIdx+2} OR UPPER(b.publisher) LIKE UPPER(:${bindIdx+3}))`
      binds.push(s, s, s, s); bindIdx += 4
    }
    if (params.category_id) { where += ` AND b.category_id = :${bindIdx}`; binds.push(params.category_id); bindIdx++ }
    if (params.availability === 'available')   { where += ` AND b.available_copies > 0` }
    if (params.availability === 'unavailable') { where += ` AND b.available_copies = 0` }

    const countRows = await q(
      `SELECT COUNT(*) AS TOTAL FROM books b LEFT JOIN categories c ON b.category_id = c.id ${where}`,
      binds
    )
    const total = (countRows[0] as any).TOTAL

    const page  = params.page  || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    const rows = await q(`
      SELECT b.*, c.name AS category_name
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      ${where}
      ORDER BY b.title
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit])

    // normalise keys to lowercase
    const books = rows.map(r => normalise(r))
    return { books, total, page, limit }
  })

  ipcMain.handle('books:getOne', async (_e, id) => {
    const rows = await q(`
      SELECT b.*, c.name AS category_name
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = :1
    `, [id])
    return rows.length ? normalise(rows[0]) : null
  })

  ipcMain.handle('books:create', async (_e, data) => {
    if (data.isbn) {
      const ex = await q(`SELECT id FROM books WHERE isbn = :1`, [data.isbn])
      if (ex.length) return { success: false, error: 'A book with this ISBN already exists' }
    }
    await x(`
      INSERT INTO books (title, isbn, author, publisher, edition, publication_year, category_id, language, shelf_number, total_copies, available_copies, description)
      VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12)
    `, [
      data.title, data.isbn || null, data.author, data.publisher || null, data.edition || null,
      data.publication_year || null, data.category_id || null, data.language || 'English',
      data.shelf_number || null, data.total_copies || 1, data.total_copies || 1, data.description || null,
    ])
    const rows = await q(`SELECT id FROM books WHERE isbn = :1`, [data.isbn || ''])
    let bookId: number
    if (rows.length) {
      bookId = rows[0].ID
    } else {
      const r2 = await q(`SELECT id FROM books WHERE title=:1 AND author=:2 ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`, [data.title, data.author])
      bookId = r2[0]?.ID
    }
    for (let i = 1; i <= (data.total_copies || 1); i++) {
      const accNum = `ACC${String(bookId).padStart(4, '0')}${String(i).padStart(2, '0')}`
      await x(`INSERT INTO book_copies (book_id, accession_number) VALUES (:1, :2)`, [bookId, accNum])
    }
    return { success: true, id: bookId }
  })

  ipcMain.handle('books:update', async (_e, data) => {
    if (data.isbn) {
      const ex = await q(`SELECT id FROM books WHERE isbn = :1 AND id != :2`, [data.isbn, data.id])
      if (ex.length) return { success: false, error: 'Another book with this ISBN already exists' }
    }
    await x(`
      UPDATE books SET title=:1, isbn=:2, author=:3, publisher=:4, edition=:5, publication_year=:6,
        category_id=:7, language=:8, shelf_number=:9, description=:10, updated_at=SYSTIMESTAMP
      WHERE id=:11
    `, [
      data.title, data.isbn || null, data.author, data.publisher || null, data.edition || null,
      data.publication_year || null, data.category_id || null, data.language || 'English',
      data.shelf_number || null, data.description || null, data.id,
    ])
    return { success: true }
  })

  ipcMain.handle('books:delete', async (_e, id) => {
    const active = await q(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE book_id=:1 AND status IN ('active','overdue')`, [id])
    if ((active[0] as any).CNT > 0) return { success: false, error: 'Cannot delete book with active loans' }
    await x(`DELETE FROM books WHERE id = :1`, [id])
    return { success: true }
  })

  ipcMain.handle('books:getCategories', async () => {
    const rows = await q(`SELECT * FROM categories ORDER BY name`)
    return rows.map(r => normalise(r))
  })

  ipcMain.handle('books:createCategory', async (_e, name) => {
    await x(`INSERT INTO categories (name) VALUES (:1)`, [name])
    const rows = await q(`SELECT id FROM categories WHERE name = :1`, [name])
    return { success: true, id: rows[0]?.ID }
  })

  ipcMain.handle('books:getCopies', async (_e, bookId) => {
    const rows = await q(`
      SELECT bc.*,
        CASE WHEN it.id IS NOT NULL THEN m.full_name ELSE NULL END AS borrowed_by,
        CASE WHEN it.id IS NOT NULL THEN TO_CHAR(it.due_date,'YYYY-MM-DD') ELSE NULL END AS due_date,
        CASE WHEN it.id IS NOT NULL THEN m.member_id ELSE NULL END AS member_code
      FROM book_copies bc
      LEFT JOIN issue_transactions it ON it.book_copy_id = bc.id AND it.status IN ('active','overdue')
      LEFT JOIN members m ON it.member_id = m.id
      WHERE bc.book_id = :1
      ORDER BY bc.accession_number
    `, [bookId])
    return rows.map(r => normalise(r))
  })

  ipcMain.handle('books:getHistory', async (_e, bookId) => {
    const rows = await q(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, bc.accession_number,
             TO_CHAR(rt.return_date,'YYYY-MM-DD') AS return_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      LEFT JOIN return_transactions rt ON rt.issue_id = it.id
      WHERE it.book_id = :1
      ORDER BY it.created_at DESC
      FETCH FIRST 50 ROWS ONLY
    `, [bookId])
    return rows.map(r => normalise(r))
  })
}

/** Oracle returns column names UPPERCASE — convert to lowercase for React */
function normalise(row: any): any {
  if (!row) return row
  const out: any = {}
  for (const k of Object.keys(row)) {
    out[k.toLowerCase()] = row[k]
  }
  return out
}

