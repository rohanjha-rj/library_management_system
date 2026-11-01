import oracledb from 'oracledb'
import bcrypt from 'bcryptjs'
import { getConnection } from './oracle-init'

/** Helper: run a single DML statement with autoCommit */
async function exec(sql: string, binds: any[] | object = []): Promise<oracledb.Result<any>> {
  const conn = await getConnection()
  try {
    const result = await conn.execute(sql, binds, { autoCommit: true })
    return result
  } finally {
    await conn.close()
  }
}

/** Helper: query (SELECT) returning rows as objects */
async function query<T = any>(sql: string, binds: any[] | object = []): Promise<T[]> {
  const conn = await getConnection()
  try {
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    return (result.rows || []) as T[]
  } finally {
    await conn.close()
  }
}

export async function seedDatabase(): Promise<void> {
  // Check if already seeded
  const rows = await query(`SELECT COUNT(*) AS CNT FROM users`)
  if ((rows[0] as any).CNT > 0) return

  // Roles
  const rolesSql = `INSERT INTO roles (name, description, permissions) VALUES (:1, :2, :3)`
  await exec(rolesSql, ['administrator', 'Full system access', JSON.stringify(['*'])])
  await exec(rolesSql, ['librarian', 'Manage books, members, circulation', JSON.stringify(['books', 'members', 'circulation', 'fines', 'reports'])])
  await exec(rolesSql, ['assistant_librarian', 'Limited circulation operations', JSON.stringify(['books:read', 'members:read', 'circulation:issue', 'circulation:return'])])

  // Users
  const adminHash  = bcrypt.hashSync('admin123', 10)
  const libHash    = bcrypt.hashSync('lib123', 10)
  const assistHash = bcrypt.hashSync('assist123', 10)
  const userSql = `INSERT INTO users (username, password_hash, full_name, email, role_id) VALUES (:1, :2, :3, :4, :5)`
  await exec(userSql, ['admin',     adminHash,  'System Administrator', 'admin@library.edu',      1])
  await exec(userSql, ['librarian', libHash,    'Ms. Priya Sharma',    'priya.sharma@library.edu', 2])
  await exec(userSql, ['assistant', assistHash, 'Mr. Ravi Kumar',      'ravi.kumar@library.edu',   3])

  // Library Settings
  const settingsSql = `INSERT INTO library_settings (key_name, value, description) VALUES (:1, :2, :3)`
  const settings = [
    ['library_name',       'Vidyasagar College Library',          'Name of the library'],
    ['library_address',    '42 College Road, Pune, Maharashtra 411001', 'Library address'],
    ['library_phone',      '+91 20 2345 6789',                    'Library phone number'],
    ['library_email',      'library@vidyasagar.edu',              'Library email'],
    ['fine_per_day',       '2.00',                                'Fine amount per overdue day in rupees'],
    ['max_loan_days',      '14',                                  'Default maximum loan duration in days'],
    ['max_books_per_member','3',                                  'Default maximum books per member'],
    ['renewal_limit',      '2',                                   'Maximum number of renewals per loan'],
    ['renewal_days',       '7',                                   'Additional days added per renewal'],
    ['currency_symbol',    '₹',                                   'Currency symbol'],
    ['academic_year',      '2025-2026',                           'Current academic year'],
  ]
  for (const s of settings) await exec(settingsSql, s)

  // Membership Types
  const mtSql = `INSERT INTO membership_types (name, max_books, loan_days, description) VALUES (:1, :2, :3, :4)`
  await exec(mtSql, ['Student',          3,  14, 'Undergraduate and postgraduate students'])
  await exec(mtSql, ['Faculty',          10, 30, 'Teaching and non-teaching staff'])
  await exec(mtSql, ['Research Scholar', 6,  21, 'PhD and research scholars'])
  await exec(mtSql, ['Staff',            5,  14, 'Administrative staff'])

  // Categories
  const catSql = `INSERT INTO categories (name) VALUES (:1)`
  const categories = [
    'Computer Science','Mathematics','Physics','Chemistry','Biology',
    'Engineering','Management','Economics','Literature','History',
    'Psychology','Philosophy','Law','Medicine','Reference',
  ]
  for (const c of categories) await exec(catSql, [c])

  // Get category IDs
  const catRows = await query<any>(`SELECT id, name FROM categories ORDER BY id`)
  const catMap: Record<string, number> = {}
  for (const r of catRows) catMap[r.NAME] = r.ID

  // Books
  const books = [
    { title: 'Introduction to Algorithms', isbn: '9780262033848', author: 'Cormen, Leiserson, Rivest, Stein', publisher: 'MIT Press', edition: '4th', year: 2022, cat: 'Computer Science', shelf: 'CS-A1', copies: 3 },
    { title: 'The Pragmatic Programmer', isbn: '9780135957059', author: 'David Thomas, Andrew Hunt', publisher: 'Addison-Wesley', edition: '20th Anniversary', year: 2019, cat: 'Computer Science', shelf: 'CS-A2', copies: 2 },
    { title: 'Clean Code', isbn: '9780132350884', author: 'Robert C. Martin', publisher: 'Prentice Hall', edition: '1st', year: 2008, cat: 'Computer Science', shelf: 'CS-A3', copies: 2 },
    { title: 'Design Patterns: Elements of Reusable Object-Oriented Software', isbn: '9780201633610', author: 'Gang of Four', publisher: 'Addison-Wesley', edition: '1st', year: 1994, cat: 'Computer Science', shelf: 'CS-A4', copies: 1 },
    { title: 'Computer Networks', isbn: '9780133594676', author: 'Andrew S. Tanenbaum', publisher: 'Pearson', edition: '5th', year: 2010, cat: 'Computer Science', shelf: 'CS-B1', copies: 4 },
    { title: 'Operating System Concepts', isbn: '9781119800361', author: 'Silberschatz, Galvin, Gagne', publisher: 'Wiley', edition: '10th', year: 2018, cat: 'Computer Science', shelf: 'CS-B2', copies: 3 },
    { title: 'Database System Concepts', isbn: '9780078022159', author: 'Silberschatz, Korth, Sudarshan', publisher: 'McGraw-Hill', edition: '7th', year: 2019, cat: 'Computer Science', shelf: 'CS-B3', copies: 2 },
    { title: 'Artificial Intelligence: A Modern Approach', isbn: '9780134610993', author: 'Stuart Russell, Peter Norvig', publisher: 'Pearson', edition: '4th', year: 2020, cat: 'Computer Science', shelf: 'CS-C1', copies: 3 },
    { title: 'Calculus: Early Transcendentals', isbn: '9781285741550', author: 'James Stewart', publisher: 'Cengage Learning', edition: '8th', year: 2015, cat: 'Mathematics', shelf: 'MA-A1', copies: 5 },
    { title: 'Linear Algebra and Its Applications', isbn: '9780321982384', author: 'David Lay', publisher: 'Pearson', edition: '5th', year: 2015, cat: 'Mathematics', shelf: 'MA-A2', copies: 3 },
    { title: 'Discrete Mathematics and Its Applications', isbn: '9780073383095', author: 'Kenneth Rosen', publisher: 'McGraw-Hill', edition: '8th', year: 2018, cat: 'Mathematics', shelf: 'MA-B1', copies: 4 },
    { title: 'University Physics', isbn: '9780133969290', author: 'Young, Freedman', publisher: 'Pearson', edition: '14th', year: 2015, cat: 'Physics', shelf: 'PH-A1', copies: 4 },
    { title: 'Modern Physics', isbn: '9781133103721', author: 'Paul A. Tipler', publisher: 'W.H. Freeman', edition: '6th', year: 2012, cat: 'Physics', shelf: 'PH-A2', copies: 2 },
    { title: 'Organic Chemistry', isbn: '9781305580350', author: 'John McMurry', publisher: 'Cengage', edition: '9th', year: 2015, cat: 'Chemistry', shelf: 'CH-A1', copies: 3 },
    { title: 'Physical Chemistry', isbn: '9780198816461', author: 'Peter Atkins, Julio de Paula', publisher: 'Oxford', edition: '11th', year: 2017, cat: 'Chemistry', shelf: 'CH-B1', copies: 2 },
    { title: 'Engineering Mathematics', isbn: '9780230364004', author: 'K.A. Stroud', publisher: 'Palgrave Macmillan', edition: '7th', year: 2013, cat: 'Engineering', shelf: 'EN-A1', copies: 6 },
    { title: 'Principles of Management', isbn: '9781259894343', author: 'Harold Koontz', publisher: 'McGraw-Hill', edition: '12th', year: 2017, cat: 'Management', shelf: 'MG-A1', copies: 4 },
    { title: 'Financial Management', isbn: '9789388002936', author: 'I.M. Pandey', publisher: 'Vikas', edition: '12th', year: 2021, cat: 'Management', shelf: 'MG-B1', copies: 3 },
    { title: 'Microeconomics', isbn: '9780393603583', author: 'Robert S. Pindyck', publisher: 'Pearson', edition: '9th', year: 2017, cat: 'Economics', shelf: 'EC-A1', copies: 3 },
    { title: 'Macroeconomics', isbn: '9781319105990', author: 'N. Gregory Mankiw', publisher: 'Worth Publishers', edition: '10th', year: 2019, cat: 'Economics', shelf: 'EC-B1', copies: 4 },
    { title: 'The Great Gatsby', isbn: '9780743273565', author: 'F. Scott Fitzgerald', publisher: 'Scribner', edition: 'Reprint', year: 2004, cat: 'Literature', shelf: 'LT-A1', copies: 2 },
    { title: 'To Kill a Mockingbird', isbn: '9780061935466', author: 'Harper Lee', publisher: 'HarperCollins', edition: '50th Anniversary', year: 2010, cat: 'Literature', shelf: 'LT-A2', copies: 2 },
    { title: 'A Brief History of Time', isbn: '9780553380163', author: 'Stephen Hawking', publisher: 'Bantam Books', edition: 'Updated', year: 1998, cat: 'Physics', shelf: 'PH-C1', copies: 3 },
    { title: 'Sapiens: A Brief History of Humankind', isbn: '9780062316097', author: 'Yuval Noah Harari', publisher: 'Harper', edition: '1st', year: 2015, cat: 'History', shelf: 'HI-A1', copies: 4 },
    { title: 'Introduction to Psychology', isbn: '9780495810919', author: 'Rod Plotnik', publisher: 'Cengage', edition: '9th', year: 2010, cat: 'Psychology', shelf: 'PS-A1', copies: 3 },
    { title: 'The Republic', isbn: '9780140455113', author: 'Plato', publisher: 'Penguin Classics', edition: 'Reprint', year: 2007, cat: 'Philosophy', shelf: 'PH-A1', copies: 2 },
    { title: 'Introduction to Law', isbn: '9780199688333', author: 'Penner, Shute, Nobles', publisher: 'Oxford', edition: '2nd', year: 2012, cat: 'Law', shelf: 'LW-A1', copies: 2 },
    { title: "Gray's Anatomy", isbn: '9780702052309', author: 'Henry Gray', publisher: 'Elsevier', edition: '42nd', year: 2020, cat: 'Medicine', shelf: 'ME-A1', copies: 2 },
    { title: 'Business Communication', isbn: '9789387383258', author: 'Bovee, Thill', publisher: 'Pearson', edition: '12th', year: 2018, cat: 'Management', shelf: 'MG-C1', copies: 3 },
    { title: 'Data Structures Using C', isbn: '9780198066408', author: 'Reema Thareja', publisher: 'Oxford', edition: '2nd', year: 2014, cat: 'Computer Science', shelf: 'CS-D1', copies: 4 },
  ]

  const bookSql = `
    INSERT INTO books (title, isbn, author, publisher, edition, publication_year, category_id, shelf_number, total_copies, available_copies)
    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10)
  `
  const copySql = `INSERT INTO book_copies (book_id, accession_number, condition) VALUES (:1, :2, 'Good')`
  const bookIds: number[] = []

  for (let i = 0; i < books.length; i++) {
    const b = books[i]
    const result = await exec(bookSql, [
      b.title, b.isbn, b.author, b.publisher, b.edition, b.year,
      catMap[b.cat] || null, b.shelf, b.copies, b.copies,
    ])
    // Get the inserted book ID
    const idRows = await query<any>(`SELECT id FROM books WHERE isbn = :1`, [b.isbn])
    const bookId = idRows[0]?.ID
    if (bookId) {
      bookIds.push(bookId)
      for (let c = 1; c <= b.copies; c++) {
        const accNum = `ACC${String(i + 1).padStart(4, '0')}${String(c).padStart(2, '0')}`
        await exec(copySql, [bookId, accNum])
      }
    }
  }

  // Members
  const members = [
    { mid: 'MEM-2024-001', name: 'Aarav Mehta',       reg: 'REG2021CS001', dept: 'Computer Science', course: 'B.Tech',                 email: 'aarav.m@student.edu',   phone: '9876543201', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
    { mid: 'MEM-2024-002', name: 'Priya Nair',        reg: 'REG2021CS002', dept: 'Computer Science', course: 'B.Tech',                 email: 'priya.n@student.edu',   phone: '9876543202', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
    { mid: 'MEM-2024-003', name: 'Rohit Gupta',       reg: 'REG2021MA001', dept: 'Mathematics',      course: 'B.Sc',                   email: 'rohit.g@student.edu',   phone: '9876543203', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
    { mid: 'MEM-2024-004', name: 'Sneha Iyer',        reg: 'REG2022EC001', dept: 'Economics',        course: 'M.A.',                   email: 'sneha.i@student.edu',   phone: '9876543204', type: 1, start: '2024-07-01', expiry: '2025-06-30' },
    { mid: 'MEM-2024-005', name: 'Vikram Rao',        reg: 'REG2020PH001', dept: 'Physics',          course: 'M.Sc',                   email: 'vikram.r@student.edu',  phone: '9876543205', type: 3, start: '2024-01-01', expiry: '2026-12-31' },
    { mid: 'MEM-2024-006', name: 'Anita Singh',       reg: 'FAC001',       dept: 'Chemistry',        course: 'Professor',              email: 'anita.s@faculty.edu',   phone: '9876543206', type: 2, start: '2024-04-01', expiry: '2025-03-31' },
    { mid: 'MEM-2024-007', name: 'Dr. Rajan Krishnan',reg: 'FAC002',       dept: 'Computer Science', course: 'Associate Professor',     email: 'rajan.k@faculty.edu',   phone: '9876543207', type: 2, start: '2024-04-01', expiry: '2025-03-31' },
    { mid: 'MEM-2024-008', name: 'Kavya Reddy',       reg: 'REG2022MG001', dept: 'Management',       course: 'MBA',                    email: 'kavya.r@student.edu',   phone: '9876543208', type: 1, start: '2024-07-01', expiry: '2025-06-30' },
    { mid: 'MEM-2024-009', name: 'Arjun Desai',       reg: 'REG2021EN001', dept: 'Engineering',      course: 'B.Tech',                 email: 'arjun.d@student.edu',   phone: '9876543209', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
    { mid: 'MEM-2024-010', name: 'Meera Pillai',      reg: 'PHD001',       dept: 'Physics',          course: 'PhD Scholar',            email: 'meera.p@research.edu',  phone: '9876543210', type: 3, start: '2024-01-01', expiry: '2027-12-31' },
    { mid: 'MEM-2024-011', name: 'Siddharth Joshi',   reg: 'REG2023CS001', dept: 'Computer Science', course: 'B.Tech',                 email: 'sid.j@student.edu',     phone: '9876543211', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
    { mid: 'MEM-2024-012', name: 'Deepika Nambiar',   reg: 'STF001',       dept: 'Administration',   course: 'Administrative Staff',   email: 'deepika.n@admin.edu',   phone: '9876543212', type: 4, start: '2024-04-01', expiry: '2025-03-31' },
    { mid: 'MEM-2024-013', name: 'Arun Patel',        reg: 'REG2022CH001', dept: 'Chemistry',        course: 'M.Sc',                   email: 'arun.p@student.edu',    phone: '9876543213', type: 1, start: '2024-07-01', expiry: '2025-06-30' },
    { mid: 'MEM-2024-014', name: 'Nisha Thomas',      reg: 'REG2021EC001', dept: 'Economics',        course: 'B.A.',                   email: 'nisha.t@student.edu',   phone: '9876543214', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
    { mid: 'MEM-2024-015', name: 'Karan Shah',        reg: 'REG2020CS003', dept: 'Computer Science', course: 'M.Tech',                 email: 'karan.s@student.edu',   phone: '9876543215', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
  ]

  const memberSql = `
    INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone, membership_type_id, membership_start, membership_expiry, status)
    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, TO_DATE(:9,'YYYY-MM-DD'), TO_DATE(:10,'YYYY-MM-DD'), 'active')
  `
  for (const m of members) {
    await exec(memberSql, [m.mid, m.name, m.reg, m.dept, m.course, m.email, m.phone, m.type, m.start, m.expiry])
  }

  // Helper: fetch IDs
  async function getCopyId(accNum: string): Promise<number | null> {
    const rows = await query<any>(`SELECT id, book_id FROM book_copies WHERE accession_number = :1`, [accNum])
    return rows.length ? rows[0] : null
  }
  async function getMemberId(mid: string): Promise<number | null> {
    const rows = await query<any>(`SELECT id FROM members WHERE member_id = :1`, [mid])
    return rows.length ? rows[0].ID : null
  }

  const today = new Date()
  const fmt  = (d: Date) => d.toISOString().split('T')[0]
  const ago  = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d) }
  const from = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d) }

  const issueSql = `
    INSERT INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
    VALUES (:1, :2, :3, 1, TO_DATE(:4,'YYYY-MM-DD'), TO_DATE(:5,'YYYY-MM-DD'), :6)
  `

  // Active loans
  const activeLoans = [
    { acc: 'ACC000101', mid: 'MEM-2024-001', issue: ago(5),  due: from(9)  },
    { acc: 'ACC000201', mid: 'MEM-2024-002', issue: ago(10), due: from(4)  },
    { acc: 'ACC000501', mid: 'MEM-2024-007', issue: ago(7),  due: from(23) },
    { acc: 'ACC000901', mid: 'MEM-2024-009', issue: ago(3),  due: from(11) },
    { acc: 'ACC001601', mid: 'MEM-2024-006', issue: ago(12), due: from(18) },
  ]
  for (const l of activeLoans) {
    const copy = await getCopyId(l.acc)
    const memId = await getMemberId(l.mid)
    if (!copy || !memId) continue
    await exec(issueSql, [memId, (copy as any).ID, (copy as any).BOOK_ID, l.issue, l.due, 'active'])
    await exec(`UPDATE book_copies SET is_available = 0 WHERE accession_number = :1`, [l.acc])
    await exec(`UPDATE books SET available_copies = available_copies - 1 WHERE id = :1`, [(copy as any).BOOK_ID])
  }

  // Overdue loans
  const overdueLoans = [
    { acc: 'ACC000301', mid: 'MEM-2024-003', issue: ago(20), due: ago(6),  overdueDays: 6  },
    { acc: 'ACC000601', mid: 'MEM-2024-008', issue: ago(25), due: ago(11), overdueDays: 11 },
    { acc: 'ACC001201', mid: 'MEM-2024-015', issue: ago(18), due: ago(4),  overdueDays: 4  },
  ]
  for (const l of overdueLoans) {
    const copy = await getCopyId(l.acc)
    const memId = await getMemberId(l.mid)
    if (!copy || !memId) continue
    const r = await exec(issueSql, [memId, (copy as any).ID, (copy as any).BOOK_ID, l.issue, l.due, 'overdue'])
    // Get last inserted issue id
    const issRows = await query<any>(
      `SELECT id FROM issue_transactions WHERE member_id=:1 AND book_copy_id=:2 AND status='overdue' ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
      [memId, (copy as any).ID]
    )
    const issueId = issRows[0]?.ID
    await exec(`UPDATE book_copies SET is_available = 0 WHERE accession_number = :1`, [l.acc])
    await exec(`UPDATE books SET available_copies = available_copies - 1 WHERE id = :1`, [(copy as any).BOOK_ID])
    if (issueId) {
      await exec(
        `INSERT INTO fine_records (issue_id, member_id, amount, overdue_days, status) VALUES (:1, :2, :3, :4, 'pending')`,
        [issueId, memId, l.overdueDays * 2.0, l.overdueDays]
      )
    }
  }

  // Returned loans
  const returnedLoans = [
    { acc: 'ACC000701', mid: 'MEM-2024-004', issue: ago(45), due: ago(31), ret: ago(28) },
    { acc: 'ACC001001', mid: 'MEM-2024-005', issue: ago(50), due: ago(36), ret: ago(34) },
    { acc: 'ACC000401', mid: 'MEM-2024-013', issue: ago(35), due: ago(21), ret: ago(19) },
    { acc: 'ACC001401', mid: 'MEM-2024-014', issue: ago(30), due: ago(16), ret: ago(15) },
    { acc: 'ACC002101', mid: 'MEM-2024-001', issue: ago(70), due: ago(56), ret: ago(55) },
    { acc: 'ACC001901', mid: 'MEM-2024-012', issue: ago(40), due: ago(26), ret: ago(20) },
  ]
  for (const l of returnedLoans) {
    const copy = await getCopyId(l.acc)
    const memId = await getMemberId(l.mid)
    if (!copy || !memId) continue
    await exec(issueSql, [memId, (copy as any).ID, (copy as any).BOOK_ID, l.issue, l.due, 'returned'])
    const issRows = await query<any>(
      `SELECT id FROM issue_transactions WHERE member_id=:1 AND book_copy_id=:2 AND status='returned' ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
      [memId, (copy as any).ID]
    )
    const issueId = issRows[0]?.ID
    if (issueId) {
      await exec(
        `INSERT INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days)
         VALUES (:1, :2, :3, :4, 1, TO_DATE(:5,'YYYY-MM-DD'), 0)`,
        [issueId, memId, (copy as any).ID, (copy as any).BOOK_ID, l.ret]
      )
    }
  }
}

