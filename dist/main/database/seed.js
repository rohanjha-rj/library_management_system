"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function seedDatabase(db) {
    const alreadySeeded = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
    if (alreadySeeded.cnt > 0)
        return;
    // Roles
    db.prepare(`INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)`).run('administrator', 'Full system access', JSON.stringify(['*']));
    db.prepare(`INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)`).run('librarian', 'Manage books, members, circulation', JSON.stringify(['books', 'members', 'circulation', 'fines', 'reports']));
    db.prepare(`INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)`).run('assistant_librarian', 'Limited circulation operations', JSON.stringify(['books:read', 'members:read', 'circulation:issue', 'circulation:return']));
    // Users
    const adminHash = bcryptjs_1.default.hashSync('admin123', 10);
    const libHash = bcryptjs_1.default.hashSync('lib123', 10);
    const assistHash = bcryptjs_1.default.hashSync('assist123', 10);
    db.prepare(`INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, 1)`)
        .run('admin', adminHash, 'System Administrator', 'admin@library.edu');
    db.prepare(`INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, 2)`)
        .run('librarian', libHash, 'Ms. Priya Sharma', 'priya.sharma@library.edu');
    db.prepare(`INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, 3)`)
        .run('assistant', assistHash, 'Mr. Ravi Kumar', 'ravi.kumar@library.edu');
    // Library Settings
    const settings = [
        ['library_name', 'Vidyasagar College Library', 'Name of the library'],
        ['library_address', '42 College Road, Pune, Maharashtra 411001', 'Library address'],
        ['library_phone', '+91 20 2345 6789', 'Library phone number'],
        ['library_email', 'library@vidyasagar.edu', 'Library email'],
        ['fine_per_day', '2.00', 'Fine amount per overdue day in rupees'],
        ['max_loan_days', '14', 'Default maximum loan duration in days'],
        ['max_books_per_member', '3', 'Default maximum books per member'],
        ['renewal_limit', '2', 'Maximum number of renewals per loan'],
        ['renewal_days', '7', 'Additional days added per renewal'],
        ['currency_symbol', '₹', 'Currency symbol'],
        ['academic_year', '2025-2026', 'Current academic year'],
    ];
    const settingStmt = db.prepare(`INSERT OR IGNORE INTO library_settings (key, value, description) VALUES (?, ?, ?)`);
    for (const [key, value, desc] of settings)
        settingStmt.run(key, value, desc);
    // Membership Types
    const mtStmt = db.prepare(`INSERT OR IGNORE INTO membership_types (name, max_books, loan_days, description) VALUES (?, ?, ?, ?)`);
    mtStmt.run('Student', 3, 14, 'Undergraduate and postgraduate students');
    mtStmt.run('Faculty', 10, 30, 'Teaching and non-teaching staff');
    mtStmt.run('Research Scholar', 6, 21, 'PhD and research scholars');
    mtStmt.run('Staff', 5, 14, 'Administrative staff');
    // Categories
    const catStmt = db.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`);
    const categories = [
        'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
        'Engineering', 'Management', 'Economics', 'Literature', 'History',
        'Psychology', 'Philosophy', 'Law', 'Medicine', 'Reference'
    ];
    for (const c of categories)
        catStmt.run(c);
    // Books
    const books = [
        { title: 'Introduction to Algorithms', isbn: '9780262033848', author: 'Cormen, Leiserson, Rivest, Stein', publisher: 'MIT Press', edition: '4th', year: 2022, cat: 1, shelf: 'CS-A1', copies: 3 },
        { title: 'The Pragmatic Programmer', isbn: '9780135957059', author: 'David Thomas, Andrew Hunt', publisher: 'Addison-Wesley', edition: '20th Anniversary', year: 2019, cat: 1, shelf: 'CS-A2', copies: 2 },
        { title: 'Clean Code', isbn: '9780132350884', author: 'Robert C. Martin', publisher: 'Prentice Hall', edition: '1st', year: 2008, cat: 1, shelf: 'CS-A3', copies: 2 },
        { title: 'Design Patterns: Elements of Reusable Object-Oriented Software', isbn: '9780201633610', author: 'Gang of Four', publisher: 'Addison-Wesley', edition: '1st', year: 1994, cat: 1, shelf: 'CS-A4', copies: 1 },
        { title: 'Computer Networks', isbn: '9780133594676', author: 'Andrew S. Tanenbaum', publisher: 'Pearson', edition: '5th', year: 2010, cat: 1, shelf: 'CS-B1', copies: 4 },
        { title: 'Operating System Concepts', isbn: '9781119800361', author: 'Silberschatz, Galvin, Gagne', publisher: 'Wiley', edition: '10th', year: 2018, cat: 1, shelf: 'CS-B2', copies: 3 },
        { title: 'Database System Concepts', isbn: '9780078022159', author: 'Silberschatz, Korth, Sudarshan', publisher: 'McGraw-Hill', edition: '7th', year: 2019, cat: 1, shelf: 'CS-B3', copies: 2 },
        { title: 'Artificial Intelligence: A Modern Approach', isbn: '9780134610993', author: 'Stuart Russell, Peter Norvig', publisher: 'Pearson', edition: '4th', year: 2020, cat: 1, shelf: 'CS-C1', copies: 3 },
        { title: 'Calculus: Early Transcendentals', isbn: '9781285741550', author: 'James Stewart', publisher: 'Cengage Learning', edition: '8th', year: 2015, cat: 2, shelf: 'MA-A1', copies: 5 },
        { title: 'Linear Algebra and Its Applications', isbn: '9780321982384', author: 'David Lay', publisher: 'Pearson', edition: '5th', year: 2015, cat: 2, shelf: 'MA-A2', copies: 3 },
        { title: 'Discrete Mathematics and Its Applications', isbn: '9780073383095', author: 'Kenneth Rosen', publisher: 'McGraw-Hill', edition: '8th', year: 2018, cat: 2, shelf: 'MA-B1', copies: 4 },
        { title: 'University Physics', isbn: '9780133969290', author: 'Young, Freedman', publisher: 'Pearson', edition: '14th', year: 2015, cat: 3, shelf: 'PH-A1', copies: 4 },
        { title: 'Modern Physics', isbn: '9781133103721', author: 'Paul A. Tipler', publisher: 'W.H. Freeman', edition: '6th', year: 2012, cat: 3, shelf: 'PH-A2', copies: 2 },
        { title: 'Organic Chemistry', isbn: '9781305580350', author: 'John McMurry', publisher: 'Cengage', edition: '9th', year: 2015, cat: 4, shelf: 'CH-A1', copies: 3 },
        { title: 'Physical Chemistry', isbn: '9780198816461', author: 'Peter Atkins, Julio de Paula', publisher: 'Oxford', edition: '11th', year: 2017, cat: 4, shelf: 'CH-B1', copies: 2 },
        { title: 'Engineering Mathematics', isbn: '9780230364004', author: 'K.A. Stroud', publisher: 'Palgrave Macmillan', edition: '7th', year: 2013, cat: 6, shelf: 'EN-A1', copies: 6 },
        { title: 'Principles of Management', isbn: '9781259894343', author: 'Harold Koontz', publisher: 'McGraw-Hill', edition: '12th', year: 2017, cat: 7, shelf: 'MG-A1', copies: 4 },
        { title: 'Financial Management', isbn: '9789388002936', author: 'I.M. Pandey', publisher: 'Vikas', edition: '12th', year: 2021, cat: 7, shelf: 'MG-B1', copies: 3 },
        { title: 'Microeconomics', isbn: '9780393603583', author: 'Robert S. Pindyck', publisher: 'Pearson', edition: '9th', year: 2017, cat: 8, shelf: 'EC-A1', copies: 3 },
        { title: 'Macroeconomics', isbn: '9781319105990', author: 'N. Gregory Mankiw', publisher: 'Worth Publishers', edition: '10th', year: 2019, cat: 8, shelf: 'EC-B1', copies: 4 },
        { title: 'The Great Gatsby', isbn: '9780743273565', author: 'F. Scott Fitzgerald', publisher: 'Scribner', edition: 'Reprint', year: 2004, cat: 9, shelf: 'LT-A1', copies: 2 },
        { title: 'To Kill a Mockingbird', isbn: '9780061935466', author: 'Harper Lee', publisher: 'HarperCollins', edition: '50th Anniversary', year: 2010, cat: 9, shelf: 'LT-A2', copies: 2 },
        { title: 'A Brief History of Time', isbn: '9780553380163', author: 'Stephen Hawking', publisher: 'Bantam Books', edition: 'Updated', year: 1998, cat: 3, shelf: 'PH-C1', copies: 3 },
        { title: 'Sapiens: A Brief History of Humankind', isbn: '9780062316097', author: 'Yuval Noah Harari', publisher: 'Harper', edition: '1st', year: 2015, cat: 10, shelf: 'HI-A1', copies: 4 },
        { title: 'Introduction to Psychology', isbn: '9780495810919', author: 'Rod Plotnik', publisher: 'Cengage', edition: '9th', year: 2010, cat: 11, shelf: 'PS-A1', copies: 3 },
        { title: 'The Republic', isbn: '9780140455113', author: 'Plato', publisher: 'Penguin Classics', edition: 'Reprint', year: 2007, cat: 12, shelf: 'PH-A1', copies: 2 },
        { title: 'Introduction to Law', isbn: '9780199688333', author: 'Penner, Shute, Nobles', publisher: 'Oxford', edition: '2nd', year: 2012, cat: 13, shelf: 'LW-A1', copies: 2 },
        { title: 'Gray\'s Anatomy', isbn: '9780702052309', author: 'Henry Gray', publisher: 'Elsevier', edition: '42nd', year: 2020, cat: 14, shelf: 'ME-A1', copies: 2 },
        { title: 'Business Communication', isbn: '9789387383258', author: 'Bovee, Thill', publisher: 'Pearson', edition: '12th', year: 2018, cat: 7, shelf: 'MG-C1', copies: 3 },
        { title: 'Data Structures Using C', isbn: '9780198066408', author: 'Reema Thareja', publisher: 'Oxford', edition: '2nd', year: 2014, cat: 1, shelf: 'CS-D1', copies: 4 },
    ];
    const bookStmt = db.prepare(`
    INSERT OR IGNORE INTO books (title, isbn, author, publisher, edition, publication_year, category_id, shelf_number, total_copies, available_copies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const copyStmt = db.prepare(`INSERT OR IGNORE INTO book_copies (book_id, accession_number, condition) VALUES (?, ?, ?)`);
    for (let i = 0; i < books.length; i++) {
        const b = books[i];
        const result = bookStmt.run(b.title, b.isbn, b.author, b.publisher, b.edition, b.year, b.cat, b.shelf, b.copies, b.copies);
        const bookId = result.lastInsertRowid;
        if (bookId) {
            for (let c = 1; c <= b.copies; c++) {
                const accNum = `ACC${String(i + 1).padStart(4, '0')}${String(c).padStart(2, '0')}`;
                copyStmt.run(bookId, accNum, 'Good');
            }
        }
    }
    // Members
    const members = [
        { mid: 'MEM-2024-001', name: 'Aarav Mehta', reg: 'REG2021CS001', dept: 'Computer Science', course: 'B.Tech', email: 'aarav.m@student.edu', phone: '9876543201', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
        { mid: 'MEM-2024-002', name: 'Priya Nair', reg: 'REG2021CS002', dept: 'Computer Science', course: 'B.Tech', email: 'priya.n@student.edu', phone: '9876543202', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
        { mid: 'MEM-2024-003', name: 'Rohit Gupta', reg: 'REG2021MA001', dept: 'Mathematics', course: 'B.Sc', email: 'rohit.g@student.edu', phone: '9876543203', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
        { mid: 'MEM-2024-004', name: 'Sneha Iyer', reg: 'REG2022EC001', dept: 'Economics', course: 'M.A.', email: 'sneha.i@student.edu', phone: '9876543204', type: 1, start: '2024-07-01', expiry: '2025-06-30' },
        { mid: 'MEM-2024-005', name: 'Vikram Rao', reg: 'REG2020PH001', dept: 'Physics', course: 'M.Sc', email: 'vikram.r@student.edu', phone: '9876543205', type: 3, start: '2024-01-01', expiry: '2026-12-31' },
        { mid: 'MEM-2024-006', name: 'Anita Singh', reg: 'FAC001', dept: 'Chemistry', course: 'Professor', email: 'anita.s@faculty.edu', phone: '9876543206', type: 2, start: '2024-04-01', expiry: '2025-03-31' },
        { mid: 'MEM-2024-007', name: 'Dr. Rajan Krishnan', reg: 'FAC002', dept: 'Computer Science', course: 'Associate Professor', email: 'rajan.k@faculty.edu', phone: '9876543207', type: 2, start: '2024-04-01', expiry: '2025-03-31' },
        { mid: 'MEM-2024-008', name: 'Kavya Reddy', reg: 'REG2022MG001', dept: 'Management', course: 'MBA', email: 'kavya.r@student.edu', phone: '9876543208', type: 1, start: '2024-07-01', expiry: '2025-06-30' },
        { mid: 'MEM-2024-009', name: 'Arjun Desai', reg: 'REG2021EN001', dept: 'Engineering', course: 'B.Tech', email: 'arjun.d@student.edu', phone: '9876543209', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
        { mid: 'MEM-2024-010', name: 'Meera Pillai', reg: 'PHD001', dept: 'Physics', course: 'PhD Scholar', email: 'meera.p@research.edu', phone: '9876543210', type: 3, start: '2024-01-01', expiry: '2027-12-31' },
        { mid: 'MEM-2024-011', name: 'Siddharth Joshi', reg: 'REG2023CS001', dept: 'Computer Science', course: 'B.Tech', email: 'sid.j@student.edu', phone: '9876543211', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
        { mid: 'MEM-2024-012', name: 'Deepika Nambiar', reg: 'STF001', dept: 'Administration', course: 'Administrative Staff', email: 'deepika.n@admin.edu', phone: '9876543212', type: 4, start: '2024-04-01', expiry: '2025-03-31' },
        { mid: 'MEM-2024-013', name: 'Arun Patel', reg: 'REG2022CH001', dept: 'Chemistry', course: 'M.Sc', email: 'arun.p@student.edu', phone: '9876543213', type: 1, start: '2024-07-01', expiry: '2025-06-30' },
        { mid: 'MEM-2024-014', name: 'Nisha Thomas', reg: 'REG2021EC001', dept: 'Economics', course: 'B.A.', email: 'nisha.t@student.edu', phone: '9876543214', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
        { mid: 'MEM-2024-015', name: 'Karan Shah', reg: 'REG2020CS003', dept: 'Computer Science', course: 'M.Tech', email: 'karan.s@student.edu', phone: '9876543215', type: 1, start: '2024-06-01', expiry: '2025-05-31' },
    ];
    const memberStmt = db.prepare(`
    INSERT OR IGNORE INTO members (member_id, full_name, registration_number, department, course, email, phone, membership_type_id, membership_start, membership_expiry, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);
    for (const m of members) {
        memberStmt.run(m.mid, m.name, m.reg, m.dept, m.course, m.email, m.phone, m.type, m.start, m.expiry);
    }
    // Sample issue transactions (some active, some returned, some overdue)
    const issueInsert = db.prepare(`
    INSERT OR IGNORE INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const returnInsert = db.prepare(`
    INSERT OR IGNORE INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const fineInsert = db.prepare(`
    INSERT OR IGNORE INTO fine_records (issue_id, member_id, amount, overdue_days, status)
    VALUES (?, ?, ?, ?, ?)
  `);
    // Get copy IDs for books 1-10
    const getCopy = (accNum) => {
        const copy = db.prepare('SELECT * FROM book_copies WHERE accession_number = ?').get(accNum);
        return copy;
    };
    const getMemberDbId = (mid) => {
        const m = db.prepare('SELECT id FROM members WHERE member_id = ?').get(mid);
        return m?.id;
    };
    // Active loans (current)
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
    const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); };
    const activeLoanData = [
        { acc: 'ACC000101', memberId: 'MEM-2024-001', issueDate: daysAgo(5), dueDate: daysFromNow(9) },
        { acc: 'ACC000201', memberId: 'MEM-2024-002', issueDate: daysAgo(10), dueDate: daysFromNow(4) },
        { acc: 'ACC000501', memberId: 'MEM-2024-007', issueDate: daysAgo(7), dueDate: daysFromNow(23) },
        { acc: 'ACC000901', memberId: 'MEM-2024-009', issueDate: daysAgo(3), dueDate: daysFromNow(11) },
        { acc: 'ACC001601', memberId: 'MEM-2024-006', issueDate: daysAgo(12), dueDate: daysFromNow(18) },
    ];
    // Overdue loans
    const overdueLoanData = [
        { acc: 'ACC000301', memberId: 'MEM-2024-003', issueDate: daysAgo(20), dueDate: daysAgo(6), overdueDays: 6 },
        { acc: 'ACC000601', memberId: 'MEM-2024-008', issueDate: daysAgo(25), dueDate: daysAgo(11), overdueDays: 11 },
        { acc: 'ACC001201', memberId: 'MEM-2024-015', issueDate: daysAgo(18), dueDate: daysAgo(4), overdueDays: 4 },
    ];
    // Returned loans (historical)
    const returnedLoanData = [
        { acc: 'ACC000701', memberId: 'MEM-2024-004', issueDate: daysAgo(45), dueDate: daysAgo(31), returnDate: daysAgo(28), overdue: 0 },
        { acc: 'ACC000901', memberId: 'MEM-2024-010', issueDate: daysAgo(60), dueDate: daysAgo(46), returnDate: daysAgo(44), overdue: 0 },
        { acc: 'ACC001001', memberId: 'MEM-2024-005', issueDate: daysAgo(50), dueDate: daysAgo(36), returnDate: daysAgo(34), overdue: 0 },
        { acc: 'ACC000401', memberId: 'MEM-2024-013', issueDate: daysAgo(35), dueDate: daysAgo(21), returnDate: daysAgo(19), overdue: 0 },
        { acc: 'ACC001401', memberId: 'MEM-2024-014', issueDate: daysAgo(30), dueDate: daysAgo(16), returnDate: daysAgo(15), overdue: 0 },
        { acc: 'ACC000101', memberId: 'MEM-2024-011', issueDate: daysAgo(80), dueDate: daysAgo(66), returnDate: daysAgo(63), overdue: 0 },
        { acc: 'ACC002101', memberId: 'MEM-2024-001', issueDate: daysAgo(70), dueDate: daysAgo(56), returnDate: daysAgo(55), overdue: 0 },
        { acc: 'ACC001901', memberId: 'MEM-2024-012', issueDate: daysAgo(40), dueDate: daysAgo(26), returnDate: daysAgo(20), overdue: 0 },
    ];
    // Insert active loans
    for (const loan of activeLoanData) {
        const copy = getCopy(loan.acc);
        const memId = getMemberDbId(loan.memberId);
        if (!copy || !memId)
            continue;
        const r = issueInsert.run(memId, copy.id, copy.book_id, 1, loan.issueDate, loan.dueDate, 'active');
        db.prepare('UPDATE book_copies SET is_available = 0 WHERE id = ?').run(copy.id);
        db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(copy.book_id);
    }
    // Insert overdue loans
    for (const loan of overdueLoanData) {
        const copy = getCopy(loan.acc);
        const memId = getMemberDbId(loan.memberId);
        if (!copy || !memId)
            continue;
        const r = issueInsert.run(memId, copy.id, copy.book_id, 1, loan.issueDate, loan.dueDate, 'overdue');
        const issueId = r.lastInsertRowid;
        db.prepare('UPDATE book_copies SET is_available = 0 WHERE id = ?').run(copy.id);
        db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(copy.book_id);
        // Create fine record
        fineInsert.run(issueId, memId, loan.overdueDays * 2.0, loan.overdueDays, 'pending');
    }
    // Insert returned loans
    for (const loan of returnedLoanData) {
        const copy = getCopy(loan.acc);
        const memId = getMemberDbId(loan.memberId);
        if (!copy || !memId)
            continue;
        const r = issueInsert.run(memId, copy.id, copy.book_id, 1, loan.issueDate, loan.dueDate, 'returned');
        const issueId = r.lastInsertRowid;
        returnInsert.run(issueId, memId, copy.id, copy.book_id, 1, loan.returnDate, loan.overdue);
    }
}
