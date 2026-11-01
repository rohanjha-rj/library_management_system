"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron5 = require("electron");
var import_path5 = __toESM(require("path"));
var import_fs4 = __toESM(require("fs"));
var import_oracledb10 = __toESM(require("oracledb"));

// electron/database/init.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_path = __toESM(require("path"));
var import_electron = require("electron");
var db;
function initDatabase() {
  const userDataPath = import_electron.app.getPath("userData");
  const dbPath = import_path.default.join(userDataPath, "library.db");
  db = new import_better_sqlite3.default(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  createTables(db);
  return db;
}
function createTables(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      isbn TEXT UNIQUE,
      author TEXT NOT NULL,
      publisher TEXT,
      edition TEXT,
      publication_year INTEGER,
      category_id INTEGER REFERENCES categories(id),
      language TEXT DEFAULT 'English',
      shelf_number TEXT,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS book_copies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      accession_number TEXT NOT NULL UNIQUE,
      condition TEXT DEFAULT 'Good',
      is_available INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS membership_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      max_books INTEGER NOT NULL DEFAULT 3,
      loan_days INTEGER NOT NULL DEFAULT 14,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      registration_number TEXT,
      department TEXT,
      course TEXT,
      email TEXT,
      phone TEXT,
      membership_type_id INTEGER REFERENCES membership_types(id),
      membership_start TEXT,
      membership_expiry TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS issue_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id),
      book_copy_id INTEGER NOT NULL REFERENCES book_copies(id),
      book_id INTEGER NOT NULL REFERENCES books(id),
      issued_by INTEGER NOT NULL REFERENCES users(id),
      issue_date TEXT NOT NULL DEFAULT (date('now')),
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      renewal_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS return_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issue_transactions(id),
      member_id INTEGER NOT NULL REFERENCES members(id),
      book_copy_id INTEGER NOT NULL REFERENCES book_copies(id),
      book_id INTEGER NOT NULL REFERENCES books(id),
      returned_by INTEGER NOT NULL REFERENCES users(id),
      return_date TEXT NOT NULL DEFAULT (date('now')),
      overdue_days INTEGER NOT NULL DEFAULT 0,
      condition TEXT DEFAULT 'Good',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fine_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issue_transactions(id),
      member_id INTEGER NOT NULL REFERENCES members(id),
      amount REAL NOT NULL,
      overdue_days INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      waived_reason TEXT,
      waived_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fine_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fine_id INTEGER NOT NULL REFERENCES fine_records(id),
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      received_by INTEGER NOT NULL REFERENCES users(id),
      payment_date TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS library_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
    CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
    CREATE INDEX IF NOT EXISTS idx_book_copies_accession ON book_copies(accession_number);
    CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
    CREATE INDEX IF NOT EXISTS idx_issue_trans_member ON issue_transactions(member_id);
    CREATE INDEX IF NOT EXISTS idx_issue_trans_status ON issue_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_fine_records_member ON fine_records(member_id);
    CREATE INDEX IF NOT EXISTS idx_fine_records_status ON fine_records(status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
  `);
}

// electron/database/seed.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
function seedDatabase(db2) {
  const alreadySeeded = db2.prepare("SELECT COUNT(*) as cnt FROM users").get();
  if (alreadySeeded.cnt > 0)
    return;
  db2.prepare(`INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)`).run(
    "administrator",
    "Full system access",
    JSON.stringify(["*"])
  );
  db2.prepare(`INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)`).run(
    "librarian",
    "Manage books, members, circulation",
    JSON.stringify(["books", "members", "circulation", "fines", "reports"])
  );
  db2.prepare(`INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?, ?, ?)`).run(
    "assistant_librarian",
    "Limited circulation operations",
    JSON.stringify(["books:read", "members:read", "circulation:issue", "circulation:return"])
  );
  const adminHash = import_bcryptjs.default.hashSync("admin123", 10);
  const libHash = import_bcryptjs.default.hashSync("lib123", 10);
  const assistHash = import_bcryptjs.default.hashSync("assist123", 10);
  db2.prepare(`INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, 1)`).run("admin", adminHash, "System Administrator", "admin@library.edu");
  db2.prepare(`INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, 2)`).run("librarian", libHash, "Ms. Priya Sharma", "priya.sharma@library.edu");
  db2.prepare(`INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, 3)`).run("assistant", assistHash, "Mr. Ravi Kumar", "ravi.kumar@library.edu");
  const settings = [
    ["library_name", "Vidyasagar College Library", "Name of the library"],
    ["library_address", "42 College Road, Pune, Maharashtra 411001", "Library address"],
    ["library_phone", "+91 20 2345 6789", "Library phone number"],
    ["library_email", "library@vidyasagar.edu", "Library email"],
    ["fine_per_day", "2.00", "Fine amount per overdue day in rupees"],
    ["max_loan_days", "14", "Default maximum loan duration in days"],
    ["max_books_per_member", "3", "Default maximum books per member"],
    ["renewal_limit", "2", "Maximum number of renewals per loan"],
    ["renewal_days", "7", "Additional days added per renewal"],
    ["currency_symbol", "\u20B9", "Currency symbol"],
    ["academic_year", "2025-2026", "Current academic year"]
  ];
  const settingStmt = db2.prepare(`INSERT OR IGNORE INTO library_settings (key, value, description) VALUES (?, ?, ?)`);
  for (const [key, value, desc] of settings)
    settingStmt.run(key, value, desc);
  const mtStmt = db2.prepare(`INSERT OR IGNORE INTO membership_types (name, max_books, loan_days, description) VALUES (?, ?, ?, ?)`);
  mtStmt.run("Student", 3, 14, "Undergraduate and postgraduate students");
  mtStmt.run("Faculty", 10, 30, "Teaching and non-teaching staff");
  mtStmt.run("Research Scholar", 6, 21, "PhD and research scholars");
  mtStmt.run("Staff", 5, 14, "Administrative staff");
  const catStmt = db2.prepare(`INSERT OR IGNORE INTO categories (name) VALUES (?)`);
  const categories = [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Engineering",
    "Management",
    "Economics",
    "Literature",
    "History",
    "Psychology",
    "Philosophy",
    "Law",
    "Medicine",
    "Reference"
  ];
  for (const c of categories)
    catStmt.run(c);
  const books = [
    { title: "Introduction to Algorithms", isbn: "9780262033848", author: "Cormen, Leiserson, Rivest, Stein", publisher: "MIT Press", edition: "4th", year: 2022, cat: 1, shelf: "CS-A1", copies: 3 },
    { title: "The Pragmatic Programmer", isbn: "9780135957059", author: "David Thomas, Andrew Hunt", publisher: "Addison-Wesley", edition: "20th Anniversary", year: 2019, cat: 1, shelf: "CS-A2", copies: 2 },
    { title: "Clean Code", isbn: "9780132350884", author: "Robert C. Martin", publisher: "Prentice Hall", edition: "1st", year: 2008, cat: 1, shelf: "CS-A3", copies: 2 },
    { title: "Design Patterns: Elements of Reusable Object-Oriented Software", isbn: "9780201633610", author: "Gang of Four", publisher: "Addison-Wesley", edition: "1st", year: 1994, cat: 1, shelf: "CS-A4", copies: 1 },
    { title: "Computer Networks", isbn: "9780133594676", author: "Andrew S. Tanenbaum", publisher: "Pearson", edition: "5th", year: 2010, cat: 1, shelf: "CS-B1", copies: 4 },
    { title: "Operating System Concepts", isbn: "9781119800361", author: "Silberschatz, Galvin, Gagne", publisher: "Wiley", edition: "10th", year: 2018, cat: 1, shelf: "CS-B2", copies: 3 },
    { title: "Database System Concepts", isbn: "9780078022159", author: "Silberschatz, Korth, Sudarshan", publisher: "McGraw-Hill", edition: "7th", year: 2019, cat: 1, shelf: "CS-B3", copies: 2 },
    { title: "Artificial Intelligence: A Modern Approach", isbn: "9780134610993", author: "Stuart Russell, Peter Norvig", publisher: "Pearson", edition: "4th", year: 2020, cat: 1, shelf: "CS-C1", copies: 3 },
    { title: "Calculus: Early Transcendentals", isbn: "9781285741550", author: "James Stewart", publisher: "Cengage Learning", edition: "8th", year: 2015, cat: 2, shelf: "MA-A1", copies: 5 },
    { title: "Linear Algebra and Its Applications", isbn: "9780321982384", author: "David Lay", publisher: "Pearson", edition: "5th", year: 2015, cat: 2, shelf: "MA-A2", copies: 3 },
    { title: "Discrete Mathematics and Its Applications", isbn: "9780073383095", author: "Kenneth Rosen", publisher: "McGraw-Hill", edition: "8th", year: 2018, cat: 2, shelf: "MA-B1", copies: 4 },
    { title: "University Physics", isbn: "9780133969290", author: "Young, Freedman", publisher: "Pearson", edition: "14th", year: 2015, cat: 3, shelf: "PH-A1", copies: 4 },
    { title: "Modern Physics", isbn: "9781133103721", author: "Paul A. Tipler", publisher: "W.H. Freeman", edition: "6th", year: 2012, cat: 3, shelf: "PH-A2", copies: 2 },
    { title: "Organic Chemistry", isbn: "9781305580350", author: "John McMurry", publisher: "Cengage", edition: "9th", year: 2015, cat: 4, shelf: "CH-A1", copies: 3 },
    { title: "Physical Chemistry", isbn: "9780198816461", author: "Peter Atkins, Julio de Paula", publisher: "Oxford", edition: "11th", year: 2017, cat: 4, shelf: "CH-B1", copies: 2 },
    { title: "Engineering Mathematics", isbn: "9780230364004", author: "K.A. Stroud", publisher: "Palgrave Macmillan", edition: "7th", year: 2013, cat: 6, shelf: "EN-A1", copies: 6 },
    { title: "Principles of Management", isbn: "9781259894343", author: "Harold Koontz", publisher: "McGraw-Hill", edition: "12th", year: 2017, cat: 7, shelf: "MG-A1", copies: 4 },
    { title: "Financial Management", isbn: "9789388002936", author: "I.M. Pandey", publisher: "Vikas", edition: "12th", year: 2021, cat: 7, shelf: "MG-B1", copies: 3 },
    { title: "Microeconomics", isbn: "9780393603583", author: "Robert S. Pindyck", publisher: "Pearson", edition: "9th", year: 2017, cat: 8, shelf: "EC-A1", copies: 3 },
    { title: "Macroeconomics", isbn: "9781319105990", author: "N. Gregory Mankiw", publisher: "Worth Publishers", edition: "10th", year: 2019, cat: 8, shelf: "EC-B1", copies: 4 },
    { title: "The Great Gatsby", isbn: "9780743273565", author: "F. Scott Fitzgerald", publisher: "Scribner", edition: "Reprint", year: 2004, cat: 9, shelf: "LT-A1", copies: 2 },
    { title: "To Kill a Mockingbird", isbn: "9780061935466", author: "Harper Lee", publisher: "HarperCollins", edition: "50th Anniversary", year: 2010, cat: 9, shelf: "LT-A2", copies: 2 },
    { title: "A Brief History of Time", isbn: "9780553380163", author: "Stephen Hawking", publisher: "Bantam Books", edition: "Updated", year: 1998, cat: 3, shelf: "PH-C1", copies: 3 },
    { title: "Sapiens: A Brief History of Humankind", isbn: "9780062316097", author: "Yuval Noah Harari", publisher: "Harper", edition: "1st", year: 2015, cat: 10, shelf: "HI-A1", copies: 4 },
    { title: "Introduction to Psychology", isbn: "9780495810919", author: "Rod Plotnik", publisher: "Cengage", edition: "9th", year: 2010, cat: 11, shelf: "PS-A1", copies: 3 },
    { title: "The Republic", isbn: "9780140455113", author: "Plato", publisher: "Penguin Classics", edition: "Reprint", year: 2007, cat: 12, shelf: "PH-A1", copies: 2 },
    { title: "Introduction to Law", isbn: "9780199688333", author: "Penner, Shute, Nobles", publisher: "Oxford", edition: "2nd", year: 2012, cat: 13, shelf: "LW-A1", copies: 2 },
    { title: "Gray's Anatomy", isbn: "9780702052309", author: "Henry Gray", publisher: "Elsevier", edition: "42nd", year: 2020, cat: 14, shelf: "ME-A1", copies: 2 },
    { title: "Business Communication", isbn: "9789387383258", author: "Bovee, Thill", publisher: "Pearson", edition: "12th", year: 2018, cat: 7, shelf: "MG-C1", copies: 3 },
    { title: "Data Structures Using C", isbn: "9780198066408", author: "Reema Thareja", publisher: "Oxford", edition: "2nd", year: 2014, cat: 1, shelf: "CS-D1", copies: 4 }
  ];
  const bookStmt = db2.prepare(`
    INSERT OR IGNORE INTO books (title, isbn, author, publisher, edition, publication_year, category_id, shelf_number, total_copies, available_copies)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const copyStmt = db2.prepare(`INSERT OR IGNORE INTO book_copies (book_id, accession_number, condition) VALUES (?, ?, ?)`);
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const result = bookStmt.run(b.title, b.isbn, b.author, b.publisher, b.edition, b.year, b.cat, b.shelf, b.copies, b.copies);
    const bookId = result.lastInsertRowid;
    if (bookId) {
      for (let c = 1; c <= b.copies; c++) {
        const accNum = `ACC${String(i + 1).padStart(4, "0")}${String(c).padStart(2, "0")}`;
        copyStmt.run(bookId, accNum, "Good");
      }
    }
  }
  const members = [
    { mid: "MEM-2024-001", name: "Aarav Mehta", reg: "REG2021CS001", dept: "Computer Science", course: "B.Tech", email: "aarav.m@student.edu", phone: "9876543201", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-002", name: "Priya Nair", reg: "REG2021CS002", dept: "Computer Science", course: "B.Tech", email: "priya.n@student.edu", phone: "9876543202", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-003", name: "Rohit Gupta", reg: "REG2021MA001", dept: "Mathematics", course: "B.Sc", email: "rohit.g@student.edu", phone: "9876543203", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-004", name: "Sneha Iyer", reg: "REG2022EC001", dept: "Economics", course: "M.A.", email: "sneha.i@student.edu", phone: "9876543204", type: 1, start: "2024-07-01", expiry: "2025-06-30" },
    { mid: "MEM-2024-005", name: "Vikram Rao", reg: "REG2020PH001", dept: "Physics", course: "M.Sc", email: "vikram.r@student.edu", phone: "9876543205", type: 3, start: "2024-01-01", expiry: "2026-12-31" },
    { mid: "MEM-2024-006", name: "Anita Singh", reg: "FAC001", dept: "Chemistry", course: "Professor", email: "anita.s@faculty.edu", phone: "9876543206", type: 2, start: "2024-04-01", expiry: "2025-03-31" },
    { mid: "MEM-2024-007", name: "Dr. Rajan Krishnan", reg: "FAC002", dept: "Computer Science", course: "Associate Professor", email: "rajan.k@faculty.edu", phone: "9876543207", type: 2, start: "2024-04-01", expiry: "2025-03-31" },
    { mid: "MEM-2024-008", name: "Kavya Reddy", reg: "REG2022MG001", dept: "Management", course: "MBA", email: "kavya.r@student.edu", phone: "9876543208", type: 1, start: "2024-07-01", expiry: "2025-06-30" },
    { mid: "MEM-2024-009", name: "Arjun Desai", reg: "REG2021EN001", dept: "Engineering", course: "B.Tech", email: "arjun.d@student.edu", phone: "9876543209", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-010", name: "Meera Pillai", reg: "PHD001", dept: "Physics", course: "PhD Scholar", email: "meera.p@research.edu", phone: "9876543210", type: 3, start: "2024-01-01", expiry: "2027-12-31" },
    { mid: "MEM-2024-011", name: "Siddharth Joshi", reg: "REG2023CS001", dept: "Computer Science", course: "B.Tech", email: "sid.j@student.edu", phone: "9876543211", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-012", name: "Deepika Nambiar", reg: "STF001", dept: "Administration", course: "Administrative Staff", email: "deepika.n@admin.edu", phone: "9876543212", type: 4, start: "2024-04-01", expiry: "2025-03-31" },
    { mid: "MEM-2024-013", name: "Arun Patel", reg: "REG2022CH001", dept: "Chemistry", course: "M.Sc", email: "arun.p@student.edu", phone: "9876543213", type: 1, start: "2024-07-01", expiry: "2025-06-30" },
    { mid: "MEM-2024-014", name: "Nisha Thomas", reg: "REG2021EC001", dept: "Economics", course: "B.A.", email: "nisha.t@student.edu", phone: "9876543214", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-015", name: "Karan Shah", reg: "REG2020CS003", dept: "Computer Science", course: "M.Tech", email: "karan.s@student.edu", phone: "9876543215", type: 1, start: "2024-06-01", expiry: "2025-05-31" }
  ];
  const memberStmt = db2.prepare(`
    INSERT OR IGNORE INTO members (member_id, full_name, registration_number, department, course, email, phone, membership_type_id, membership_start, membership_expiry, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);
  for (const m of members) {
    memberStmt.run(m.mid, m.name, m.reg, m.dept, m.course, m.email, m.phone, m.type, m.start, m.expiry);
  }
  const issueInsert = db2.prepare(`
    INSERT OR IGNORE INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const returnInsert = db2.prepare(`
    INSERT OR IGNORE INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const fineInsert = db2.prepare(`
    INSERT OR IGNORE INTO fine_records (issue_id, member_id, amount, overdue_days, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  const getCopy = (accNum) => {
    const copy = db2.prepare("SELECT * FROM book_copies WHERE accession_number = ?").get(accNum);
    return copy;
  };
  const getMemberDbId = (mid) => {
    const m = db2.prepare("SELECT id FROM members WHERE member_id = ?").get(mid);
    return m?.id;
  };
  const today = /* @__PURE__ */ new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const daysAgo = (n6) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - n6);
    return fmt(d);
  };
  const daysFromNow = (n6) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + n6);
    return fmt(d);
  };
  const activeLoanData = [
    { acc: "ACC000101", memberId: "MEM-2024-001", issueDate: daysAgo(5), dueDate: daysFromNow(9) },
    { acc: "ACC000201", memberId: "MEM-2024-002", issueDate: daysAgo(10), dueDate: daysFromNow(4) },
    { acc: "ACC000501", memberId: "MEM-2024-007", issueDate: daysAgo(7), dueDate: daysFromNow(23) },
    { acc: "ACC000901", memberId: "MEM-2024-009", issueDate: daysAgo(3), dueDate: daysFromNow(11) },
    { acc: "ACC001601", memberId: "MEM-2024-006", issueDate: daysAgo(12), dueDate: daysFromNow(18) }
  ];
  const overdueLoanData = [
    { acc: "ACC000301", memberId: "MEM-2024-003", issueDate: daysAgo(20), dueDate: daysAgo(6), overdueDays: 6 },
    { acc: "ACC000601", memberId: "MEM-2024-008", issueDate: daysAgo(25), dueDate: daysAgo(11), overdueDays: 11 },
    { acc: "ACC001201", memberId: "MEM-2024-015", issueDate: daysAgo(18), dueDate: daysAgo(4), overdueDays: 4 }
  ];
  const returnedLoanData = [
    { acc: "ACC000701", memberId: "MEM-2024-004", issueDate: daysAgo(45), dueDate: daysAgo(31), returnDate: daysAgo(28), overdue: 0 },
    { acc: "ACC000901", memberId: "MEM-2024-010", issueDate: daysAgo(60), dueDate: daysAgo(46), returnDate: daysAgo(44), overdue: 0 },
    { acc: "ACC001001", memberId: "MEM-2024-005", issueDate: daysAgo(50), dueDate: daysAgo(36), returnDate: daysAgo(34), overdue: 0 },
    { acc: "ACC000401", memberId: "MEM-2024-013", issueDate: daysAgo(35), dueDate: daysAgo(21), returnDate: daysAgo(19), overdue: 0 },
    { acc: "ACC001401", memberId: "MEM-2024-014", issueDate: daysAgo(30), dueDate: daysAgo(16), returnDate: daysAgo(15), overdue: 0 },
    { acc: "ACC000101", memberId: "MEM-2024-011", issueDate: daysAgo(80), dueDate: daysAgo(66), returnDate: daysAgo(63), overdue: 0 },
    { acc: "ACC002101", memberId: "MEM-2024-001", issueDate: daysAgo(70), dueDate: daysAgo(56), returnDate: daysAgo(55), overdue: 0 },
    { acc: "ACC001901", memberId: "MEM-2024-012", issueDate: daysAgo(40), dueDate: daysAgo(26), returnDate: daysAgo(20), overdue: 0 }
  ];
  for (const loan of activeLoanData) {
    const copy = getCopy(loan.acc);
    const memId = getMemberDbId(loan.memberId);
    if (!copy || !memId)
      continue;
    const r = issueInsert.run(memId, copy.id, copy.book_id, 1, loan.issueDate, loan.dueDate, "active");
    db2.prepare("UPDATE book_copies SET is_available = 0 WHERE id = ?").run(copy.id);
    db2.prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?").run(copy.book_id);
  }
  for (const loan of overdueLoanData) {
    const copy = getCopy(loan.acc);
    const memId = getMemberDbId(loan.memberId);
    if (!copy || !memId)
      continue;
    const r = issueInsert.run(memId, copy.id, copy.book_id, 1, loan.issueDate, loan.dueDate, "overdue");
    const issueId = r.lastInsertRowid;
    db2.prepare("UPDATE book_copies SET is_available = 0 WHERE id = ?").run(copy.id);
    db2.prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?").run(copy.book_id);
    fineInsert.run(issueId, memId, loan.overdueDays * 2, loan.overdueDays, "pending");
  }
  for (const loan of returnedLoanData) {
    const copy = getCopy(loan.acc);
    const memId = getMemberDbId(loan.memberId);
    if (!copy || !memId)
      continue;
    const r = issueInsert.run(memId, copy.id, copy.book_id, 1, loan.issueDate, loan.dueDate, "returned");
    const issueId = r.lastInsertRowid;
    returnInsert.run(issueId, memId, copy.id, copy.book_id, 1, loan.returnDate, loan.overdue);
  }
}

// electron/ipc/auth.ts
var import_bcryptjs2 = __toESM(require("bcryptjs"));
function registerAuthHandlers(ipcMain2, db2) {
  ipcMain2.handle("auth:login", async (_event, { username, password }) => {
    const user = db2.prepare(`
      SELECT u.*, r.name as role_name, r.permissions
      FROM users u JOIN roles r ON u.role_id = r.id
      WHERE u.username = ? AND u.is_active = 1
    `).get(username);
    if (!user)
      return { success: false, error: "Invalid username or password" };
    const valid = import_bcryptjs2.default.compareSync(password, user.password_hash);
    if (!valid)
      return { success: false, error: "Invalid username or password" };
    db2.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
    db2.prepare(`INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'LOGIN', ?)`).run(
      user.id,
      JSON.stringify({ username })
    );
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role_name,
        permissions: JSON.parse(user.permissions)
      }
    };
  });
  ipcMain2.handle("auth:logout", async (_event) => {
    return { success: true };
  });
  ipcMain2.handle("auth:changePassword", async (_event, { userId, oldPassword, newPassword }) => {
    const user = db2.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user)
      return { success: false, error: "User not found" };
    if (!import_bcryptjs2.default.compareSync(oldPassword, user.password_hash)) {
      return { success: false, error: "Current password is incorrect" };
    }
    const hash = import_bcryptjs2.default.hashSync(newPassword, 10);
    db2.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, userId);
    return { success: true };
  });
  ipcMain2.handle("auth:getUsers", async () => {
    return db2.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.is_active, u.last_login, u.created_at,
             r.name as role_name, r.id as role_id
      FROM users u JOIN roles r ON u.role_id = r.id
      ORDER BY u.full_name
    `).all();
  });
  ipcMain2.handle("auth:createUser", async (_event, data) => {
    const existing = db2.prepare("SELECT id FROM users WHERE username = ?").get(data.username);
    if (existing)
      return { success: false, error: "Username already exists" };
    const hash = import_bcryptjs2.default.hashSync(data.password, 10);
    const r = db2.prepare(`
      INSERT INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, ?)
    `).run(data.username, hash, data.full_name, data.email || null, data.role_id);
    return { success: true, id: r.lastInsertRowid };
  });
  ipcMain2.handle("auth:updateUser", async (_event, data) => {
    const updates = ["full_name = ?", "email = ?", "role_id = ?", "is_active = ?", "updated_at = datetime('now')"];
    const values = [data.full_name, data.email, data.role_id, data.is_active, data.id];
    db2.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    return { success: true };
  });
  ipcMain2.handle("auth:deleteUser", async (_event, id) => {
    db2.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(id);
    return { success: true };
  });
}

// electron/ipc/books.ts
function registerBookHandlers(ipcMain2, db2) {
  ipcMain2.handle("books:getAll", async (_event, params = {}) => {
    let query2 = `
      SELECT b.*, c.name as category_name,
             (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.is_available = 1) as available_copies_live
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `;
    const args = [];
    if (params.search) {
      query2 += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.publisher LIKE ?)`;
      const s = `%${params.search}%`;
      args.push(s, s, s, s);
    }
    if (params.category_id) {
      query2 += ` AND b.category_id = ?`;
      args.push(params.category_id);
    }
    if (params.availability === "available") {
      query2 += ` AND b.available_copies > 0`;
    }
    if (params.availability === "unavailable") {
      query2 += ` AND b.available_copies = 0`;
    }
    const countQuery = `SELECT COUNT(*) as total FROM (${query2})`;
    const total = db2.prepare(countQuery).get(...args).total;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    query2 += ` ORDER BY b.title LIMIT ? OFFSET ?`;
    args.push(limit, offset);
    const books = db2.prepare(query2).all(...args);
    return { books, total, page, limit };
  });
  ipcMain2.handle("books:getOne", async (_event, id) => {
    const book = db2.prepare(`
      SELECT b.*, c.name as category_name
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(id);
    return book;
  });
  ipcMain2.handle("books:create", async (_event, data) => {
    if (data.isbn) {
      const existing = db2.prepare("SELECT id FROM books WHERE isbn = ?").get(data.isbn);
      if (existing)
        return { success: false, error: "A book with this ISBN already exists" };
    }
    const r = db2.prepare(`
      INSERT INTO books (title, isbn, author, publisher, edition, publication_year, category_id, language, shelf_number, total_copies, available_copies, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title,
      data.isbn || null,
      data.author,
      data.publisher || null,
      data.edition || null,
      data.publication_year || null,
      data.category_id || null,
      data.language || "English",
      data.shelf_number || null,
      data.total_copies || 1,
      data.total_copies || 1,
      data.description || null
    );
    const bookId = r.lastInsertRowid;
    for (let i = 1; i <= (data.total_copies || 1); i++) {
      const accNum = `ACC${String(bookId).padStart(4, "0")}${String(i).padStart(2, "0")}`;
      db2.prepare(`INSERT OR IGNORE INTO book_copies (book_id, accession_number) VALUES (?, ?)`).run(bookId, accNum);
    }
    return { success: true, id: bookId };
  });
  ipcMain2.handle("books:update", async (_event, data) => {
    if (data.isbn) {
      const existing = db2.prepare("SELECT id FROM books WHERE isbn = ? AND id != ?").get(data.isbn, data.id);
      if (existing)
        return { success: false, error: "Another book with this ISBN already exists" };
    }
    db2.prepare(`
      UPDATE books SET title=?, isbn=?, author=?, publisher=?, edition=?, publication_year=?,
      category_id=?, language=?, shelf_number=?, description=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      data.title,
      data.isbn || null,
      data.author,
      data.publisher || null,
      data.edition || null,
      data.publication_year || null,
      data.category_id || null,
      data.language || "English",
      data.shelf_number || null,
      data.description || null,
      data.id
    );
    return { success: true };
  });
  ipcMain2.handle("books:delete", async (_event, id) => {
    const activeLoans = db2.prepare(`
      SELECT COUNT(*) as cnt FROM issue_transactions WHERE book_id = ? AND status IN ('active','overdue')
    `).get(id);
    if (activeLoans.cnt > 0) {
      return { success: false, error: "Cannot delete book with active loans" };
    }
    db2.prepare("DELETE FROM books WHERE id = ?").run(id);
    return { success: true };
  });
  ipcMain2.handle("books:getCategories", async () => {
    return db2.prepare("SELECT * FROM categories ORDER BY name").all();
  });
  ipcMain2.handle("books:createCategory", async (_event, name) => {
    const r = db2.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(name);
    return { success: true, id: r.lastInsertRowid };
  });
  ipcMain2.handle("books:getCopies", async (_event, bookId) => {
    return db2.prepare(`
      SELECT bc.*, 
        CASE WHEN it.id IS NOT NULL THEN m.full_name ELSE NULL END as borrowed_by,
        CASE WHEN it.id IS NOT NULL THEN it.due_date ELSE NULL END as due_date,
        CASE WHEN it.id IS NOT NULL THEN m.member_id ELSE NULL END as member_code
      FROM book_copies bc
      LEFT JOIN issue_transactions it ON it.book_copy_id = bc.id AND it.status IN ('active','overdue')
      LEFT JOIN members m ON it.member_id = m.id
      WHERE bc.book_id = ?
      ORDER BY bc.accession_number
    `).all(bookId);
  });
  ipcMain2.handle("books:getHistory", async (_event, bookId) => {
    return db2.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, bc.accession_number,
             rt.return_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      LEFT JOIN return_transactions rt ON rt.issue_id = it.id
      WHERE it.book_id = ?
      ORDER BY it.created_at DESC
      LIMIT 50
    `).all(bookId);
  });
}

// electron/ipc/members.ts
function registerMemberHandlers(ipcMain2, db2) {
  ipcMain2.handle("members:getAll", async (_event, params = {}) => {
    let query2 = `
      SELECT m.*, mt.name as membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) as active_loans,
        (SELECT COUNT(*) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') as pending_fines
      FROM members m
      LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      WHERE 1=1
    `;
    const args = [];
    if (params.search) {
      query2 += ` AND (m.full_name LIKE ? OR m.member_id LIKE ? OR m.registration_number LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)`;
      const s = `%${params.search}%`;
      args.push(s, s, s, s, s);
    }
    if (params.status) {
      query2 += ` AND m.status = ?`;
      args.push(params.status);
    }
    if (params.membership_type_id) {
      query2 += ` AND m.membership_type_id = ?`;
      args.push(params.membership_type_id);
    }
    if (params.department) {
      query2 += ` AND m.department LIKE ?`;
      args.push(`%${params.department}%`);
    }
    const total = db2.prepare(`SELECT COUNT(*) as total FROM (${query2})`).get(...args).total;
    const page = params.page || 1;
    const limit = params.limit || 20;
    query2 += ` ORDER BY m.full_name LIMIT ? OFFSET ?`;
    args.push(limit, (page - 1) * limit);
    return { members: db2.prepare(query2).all(...args), total, page, limit };
  });
  ipcMain2.handle("members:getOne", async (_event, id) => {
    return db2.prepare(`
      SELECT m.*, mt.name as membership_type_name, mt.max_books, mt.loan_days
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      WHERE m.id = ?
    `).get(id);
  });
  ipcMain2.handle("members:create", async (_event, data) => {
    const existing = db2.prepare("SELECT id FROM members WHERE member_id = ?").get(data.member_id);
    if (existing)
      return { success: false, error: "Member ID already exists" };
    const r = db2.prepare(`
      INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone, membership_type_id, membership_start, membership_expiry, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.member_id,
      data.full_name,
      data.registration_number || null,
      data.department || null,
      data.course || null,
      data.email || null,
      data.phone || null,
      data.membership_type_id || null,
      data.membership_start || null,
      data.membership_expiry || null,
      data.status || "active",
      data.notes || null
    );
    return { success: true, id: r.lastInsertRowid };
  });
  ipcMain2.handle("members:update", async (_event, data) => {
    db2.prepare(`
      UPDATE members SET full_name=?, registration_number=?, department=?, course=?, email=?, phone=?,
      membership_type_id=?, membership_start=?, membership_expiry=?, status=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      data.full_name,
      data.registration_number || null,
      data.department || null,
      data.course || null,
      data.email || null,
      data.phone || null,
      data.membership_type_id || null,
      data.membership_start || null,
      data.membership_expiry || null,
      data.status,
      data.notes || null,
      data.id
    );
    return { success: true };
  });
  ipcMain2.handle("members:delete", async (_event, id) => {
    const activeLoans = db2.prepare(`
      SELECT COUNT(*) as cnt FROM issue_transactions WHERE member_id = ? AND status IN ('active','overdue')
    `).get(id);
    if (activeLoans.cnt > 0)
      return { success: false, error: "Cannot delete member with active loans" };
    db2.prepare("UPDATE members SET status = ? WHERE id = ?").run("deactivated", id);
    return { success: true };
  });
  ipcMain2.handle("members:getMembershipTypes", async () => {
    return db2.prepare("SELECT * FROM membership_types ORDER BY name").all();
  });
  ipcMain2.handle("members:getHistory", async (_event, memberId) => {
    return db2.prepare(`
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
    `).all(memberId);
  });
  ipcMain2.handle("members:getActiveLoans", async (_event, memberId) => {
    return db2.prepare(`
      SELECT it.*, b.title, b.author, bc.accession_number
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.member_id = ? AND it.status IN ('active','overdue')
    `).all(memberId);
  });
}

// electron/ipc/circulation.ts
function registerCirculationHandlers(ipcMain2, db2) {
  ipcMain2.handle("circulation:issue", async (_event, data) => {
    const issue = db2.transaction(() => {
      const member = db2.prepare(`
        SELECT m.*, mt.max_books, mt.loan_days
        FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
        WHERE m.id = ?
      `).get(data.member_id);
      if (!member)
        return { success: false, error: "Member not found" };
      if (member.status !== "active")
        return { success: false, error: `Member account is ${member.status}` };
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      if (member.membership_expiry && member.membership_expiry < today) {
        return { success: false, error: "Member's membership has expired" };
      }
      const activeCount = db2.prepare(`
        SELECT COUNT(*) as cnt FROM issue_transactions WHERE member_id = ? AND status IN ('active','overdue')
      `).get(data.member_id).cnt;
      const maxBooks = member.max_books || 3;
      if (activeCount >= maxBooks) {
        return { success: false, error: `Member has reached the maximum borrowing limit of ${maxBooks} books` };
      }
      const copy = db2.prepare(`
        SELECT bc.*, b.title, b.author
        FROM book_copies bc JOIN books b ON bc.book_id = b.id
        WHERE bc.id = ?
      `).get(data.book_copy_id);
      if (!copy)
        return { success: false, error: "Book copy not found" };
      if (!copy.is_available)
        return { success: false, error: "This book copy is not available" };
      const pendingFines = db2.prepare(`
        SELECT SUM(amount) as total FROM fine_records WHERE member_id = ? AND status = 'pending'
      `).get(data.member_id).total || 0;
      const loanDays = member.loan_days || 14;
      const dueDate = /* @__PURE__ */ new Date();
      dueDate.setDate(dueDate.getDate() + loanDays);
      const dueDateStr = dueDate.toISOString().split("T")[0];
      const r = db2.prepare(`
        INSERT INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
        VALUES (?, ?, ?, ?, date('now'), ?, 'active')
      `).run(data.member_id, data.book_copy_id, copy.book_id, data.issued_by, dueDateStr);
      db2.prepare("UPDATE book_copies SET is_available = 0 WHERE id = ?").run(data.book_copy_id);
      db2.prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?").run(copy.book_id);
      db2.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'ISSUE_BOOK', 'issue_transaction', ?, ?)`).run(data.issued_by, r.lastInsertRowid, JSON.stringify({ member_id: data.member_id, book_copy_id: data.book_copy_id }));
      return {
        success: true,
        id: r.lastInsertRowid,
        dueDate: dueDateStr,
        bookTitle: copy.title,
        pendingFines
      };
    });
    return issue();
  });
  ipcMain2.handle("circulation:return", async (_event, data) => {
    const ret = db2.transaction(() => {
      const issue = db2.prepare(`
        SELECT it.*, bc.book_id, bc.accession_number, b.title
        FROM issue_transactions it
        JOIN book_copies bc ON it.book_copy_id = bc.id
        JOIN books b ON it.book_id = b.id
        WHERE it.id = ? AND it.status IN ('active','overdue')
      `).get(data.issue_id);
      if (!issue)
        return { success: false, error: "Loan record not found or already returned" };
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dueDate = new Date(issue.due_date);
      const returnDate = new Date(today);
      const overdueDays = Math.max(0, Math.floor((returnDate.getTime() - dueDate.getTime()) / 864e5));
      const settings = db2.prepare("SELECT value FROM library_settings WHERE key = 'fine_per_day'").get();
      const finePerDay = parseFloat(settings?.value || "2.00");
      const fineAmount = overdueDays * finePerDay;
      db2.prepare(`UPDATE issue_transactions SET status = 'returned' WHERE id = ?`).run(issue.id);
      db2.prepare("UPDATE book_copies SET is_available = 1 WHERE id = ?").run(issue.book_copy_id);
      db2.prepare("UPDATE books SET available_copies = available_copies + 1 WHERE id = ?").run(issue.book_id);
      const ret2 = db2.prepare(`
        INSERT INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days, condition, notes)
        VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?)
      `).run(issue.id, issue.member_id, issue.book_copy_id, issue.book_id, data.returned_by, overdueDays, data.condition || "Good", data.notes || null);
      let fineId = null;
      if (fineAmount > 0) {
        const existing = db2.prepare("SELECT id FROM fine_records WHERE issue_id = ?").get(issue.id);
        if (!existing) {
          const fr = db2.prepare(`
            INSERT INTO fine_records (issue_id, member_id, amount, overdue_days) VALUES (?, ?, ?, ?)
          `).run(issue.id, issue.member_id, fineAmount, overdueDays);
          fineId = fr.lastInsertRowid;
        } else {
          db2.prepare(`UPDATE fine_records SET amount = ?, overdue_days = ?, updated_at = datetime('now') WHERE id = ?`).run(fineAmount, overdueDays, existing.id);
          fineId = existing.id;
        }
      }
      return { success: true, overdueDays, fineAmount, fineId, bookTitle: issue.title };
    });
    return ret();
  });
  ipcMain2.handle("circulation:getActiveLoans", async (_event, params = {}) => {
    let query2 = `
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, m.department,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
    `;
    const args = [];
    if (params.search) {
      query2 += ` AND (m.full_name LIKE ? OR m.member_id LIKE ? OR b.title LIKE ? OR bc.accession_number LIKE ?)`;
      const s = `%${params.search}%`;
      args.push(s, s, s, s);
    }
    if (params.overdue_only)
      query2 += ` AND date('now') > it.due_date`;
    const total = db2.prepare(`SELECT COUNT(*) as cnt FROM (${query2})`).get(...args).cnt;
    const page = params.page || 1;
    const limit = params.limit || 20;
    query2 += ` ORDER BY it.due_date ASC LIMIT ? OFFSET ?`;
    args.push(limit, (page - 1) * limit);
    return { loans: db2.prepare(query2).all(...args), total, page, limit };
  });
  ipcMain2.handle("circulation:getLoanById", async (_event, id) => {
    return db2.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, m.department,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.id = ?
    `).get(id);
  });
  ipcMain2.handle("circulation:searchLoans", async (_event, query2) => {
    const s = `%${query2}%`;
    return db2.prepare(`
      SELECT it.*, m.full_name as member_name, m.member_id as member_code,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
        AND (m.full_name LIKE ? OR m.member_id LIKE ? OR b.title LIKE ? OR bc.accession_number LIKE ?)
      ORDER BY it.due_date ASC
      LIMIT 20
    `).all(s, s, s, s);
  });
  ipcMain2.handle("circulation:renew", async (_event, id) => {
    const loan = db2.prepare(`SELECT * FROM issue_transactions WHERE id = ? AND status = 'active'`).get(id);
    if (!loan)
      return { success: false, error: "Active loan not found" };
    const renewalLimit = parseInt(db2.prepare("SELECT value FROM library_settings WHERE key = 'renewal_limit'").get()?.value || "2");
    const renewalDays = parseInt(db2.prepare("SELECT value FROM library_settings WHERE key = 'renewal_days'").get()?.value || "7");
    if (loan.renewal_count >= renewalLimit) {
      return { success: false, error: `Renewal limit of ${renewalLimit} reached` };
    }
    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + renewalDays);
    const newDueDateStr = newDueDate.toISOString().split("T")[0];
    db2.prepare(`UPDATE issue_transactions SET due_date = ?, renewal_count = renewal_count + 1 WHERE id = ?`).run(newDueDateStr, id);
    return { success: true, newDueDate: newDueDateStr };
  });
}

// electron/ipc/fines.ts
function registerFineHandlers(ipcMain2, db2) {
  ipcMain2.handle("fines:getAll", async (_event, params = {}) => {
    let query2 = `
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
    `;
    const args = [];
    if (params.status) {
      query2 += ` AND fr.status = ?`;
      args.push(params.status);
    }
    if (params.member_id) {
      query2 += ` AND fr.member_id = ?`;
      args.push(params.member_id);
    }
    if (params.search) {
      query2 += ` AND (m.full_name LIKE ? OR m.member_id LIKE ? OR b.title LIKE ?)`;
      const s = `%${params.search}%`;
      args.push(s, s, s);
    }
    const total = db2.prepare(`SELECT COUNT(*) as cnt FROM (${query2})`).get(...args).cnt;
    const page = params.page || 1;
    const limit = params.limit || 20;
    query2 += ` ORDER BY fr.created_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, (page - 1) * limit);
    return { fines: db2.prepare(query2).all(...args), total, page, limit };
  });
  ipcMain2.handle("fines:pay", async (_event, data) => {
    const fine = db2.prepare("SELECT * FROM fine_records WHERE id = ?").get(data.fine_id);
    if (!fine)
      return { success: false, error: "Fine record not found" };
    if (fine.status !== "pending")
      return { success: false, error: "Fine is already paid or waived" };
    db2.prepare(`INSERT INTO fine_payments (fine_id, amount, payment_method, received_by, notes) VALUES (?, ?, ?, ?, ?)`).run(data.fine_id, fine.amount, data.payment_method || "cash", data.received_by, data.notes || null);
    db2.prepare(`UPDATE fine_records SET status = 'paid', updated_at = datetime('now') WHERE id = ?`).run(data.fine_id);
    return { success: true };
  });
  ipcMain2.handle("fines:waive", async (_event, data) => {
    const fine = db2.prepare("SELECT * FROM fine_records WHERE id = ?").get(data.fine_id);
    if (!fine)
      return { success: false, error: "Fine record not found" };
    db2.prepare(`UPDATE fine_records SET status = 'waived', waived_reason = ?, waived_by = ?, updated_at = datetime('now') WHERE id = ?`).run(data.reason, data.waived_by, data.fine_id);
    return { success: true };
  });
  ipcMain2.handle("fines:getPolicy", async () => {
    return db2.prepare("SELECT * FROM library_settings WHERE key IN ('fine_per_day','max_loan_days')").all();
  });
}

// electron/ipc/reports.ts
function registerReportHandlers(ipcMain2, db2) {
  ipcMain2.handle("reports:dashboardStats", async () => {
    const totalBooks = db2.prepare("SELECT COUNT(*) as cnt FROM books").get().cnt;
    const totalCopies = db2.prepare("SELECT COUNT(*) as cnt FROM book_copies").get().cnt;
    const availableCopies = db2.prepare("SELECT COUNT(*) as cnt FROM book_copies WHERE is_available = 1").get().cnt;
    const issuedCopies = db2.prepare("SELECT COUNT(*) as cnt FROM issue_transactions WHERE status IN ('active','overdue')").get().cnt;
    const overdueCount = db2.prepare("SELECT COUNT(*) as cnt FROM issue_transactions WHERE status = 'overdue' OR (status = 'active' AND due_date < date('now'))").get().cnt;
    const totalMembers = db2.prepare("SELECT COUNT(*) as cnt FROM members WHERE status = 'active'").get().cnt;
    const issuedToday = db2.prepare("SELECT COUNT(*) as cnt FROM issue_transactions WHERE issue_date = date('now')").get().cnt;
    const pendingFines = db2.prepare("SELECT COUNT(*) as cnt FROM fine_records WHERE status = 'pending'").get().cnt;
    const totalFineAmount = db2.prepare("SELECT COALESCE(SUM(amount),0) as total FROM fine_records WHERE status = 'pending'").get().total;
    return { totalBooks, totalCopies, availableCopies, issuedCopies, overdueCount, totalMembers, issuedToday, pendingFines, totalFineAmount };
  });
  ipcMain2.handle("reports:recentTransactions", async () => {
    return db2.prepare(`
      SELECT it.id, 'issue' as type, m.full_name as member_name, m.member_id as member_code,
             b.title as book_title, it.issue_date as date, it.due_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      ORDER BY it.created_at DESC LIMIT 10
    `).all();
  });
  ipcMain2.handle("reports:overdueBooks", async () => {
    return db2.prepare(`
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
    `).all();
  });
  ipcMain2.handle("reports:upcomingDues", async () => {
    return db2.prepare(`
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
    `).all();
  });
  ipcMain2.handle("reports:mostBorrowed", async () => {
    return db2.prepare(`
      SELECT b.id, b.title, b.author, c.name as category_name,
             COUNT(it.id) as borrow_count
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      GROUP BY b.id
      ORDER BY borrow_count DESC
      LIMIT 10
    `).all();
  });
  ipcMain2.handle("reports:monthlyStats", async () => {
    return db2.prepare(`
      SELECT strftime('%Y-%m', issue_date) as month,
             COUNT(*) as issued,
             SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned
      FROM issue_transactions
      WHERE issue_date >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();
  });
  ipcMain2.handle("reports:inventory", async (_event, params = {}) => {
    let query2 = `
      SELECT b.*, c.name as category_name,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) as copy_count,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.is_available = 1) as avail_count
      FROM books b LEFT JOIN categories c ON b.category_id = c.id WHERE 1=1
    `;
    const args = [];
    if (params.search) {
      query2 += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)`;
      const s = `%${params.search}%`;
      args.push(s, s, s);
    }
    if (params.category_id) {
      query2 += ` AND b.category_id = ?`;
      args.push(params.category_id);
    }
    query2 += ` ORDER BY b.title`;
    return db2.prepare(query2).all(...args);
  });
  ipcMain2.handle("reports:issued", async (_event, params = {}) => {
    let query2 = `
      SELECT it.*, m.full_name as member_name, m.member_id as member_code, m.department,
             b.title, b.author, bc.accession_number,
             CASE WHEN date('now') > it.due_date THEN CAST(julianday('now') - julianday(it.due_date) AS INTEGER) ELSE 0 END as overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
    `;
    const args = [];
    if (params.from_date) {
      query2 += ` AND it.issue_date >= ?`;
      args.push(params.from_date);
    }
    if (params.to_date) {
      query2 += ` AND it.issue_date <= ?`;
      args.push(params.to_date);
    }
    query2 += ` ORDER BY it.issue_date DESC`;
    return db2.prepare(query2).all(...args);
  });
  ipcMain2.handle("reports:returns", async (_event, params = {}) => {
    let query2 = `
      SELECT rt.*, m.full_name as member_name, m.member_id as member_code,
             b.title, b.author, bc.accession_number, it.issue_date, it.due_date
      FROM return_transactions rt
      JOIN members m ON rt.member_id = m.id
      JOIN books b ON rt.book_id = b.id
      JOIN book_copies bc ON rt.book_copy_id = bc.id
      JOIN issue_transactions it ON rt.issue_id = it.id
      WHERE 1=1
    `;
    const args = [];
    if (params.from_date) {
      query2 += ` AND rt.return_date >= ?`;
      args.push(params.from_date);
    }
    if (params.to_date) {
      query2 += ` AND rt.return_date <= ?`;
      args.push(params.to_date);
    }
    query2 += ` ORDER BY rt.return_date DESC`;
    return db2.prepare(query2).all(...args);
  });
  ipcMain2.handle("reports:fines", async (_event, params = {}) => {
    let query2 = `
      SELECT fr.*, m.full_name as member_name, m.member_id as member_code,
             b.title, it.issue_date, it.due_date
      FROM fine_records fr
      JOIN members m ON fr.member_id = m.id
      JOIN issue_transactions it ON fr.issue_id = it.id
      JOIN books b ON it.book_id = b.id
      WHERE 1=1
    `;
    const args = [];
    if (params.status) {
      query2 += ` AND fr.status = ?`;
      args.push(params.status);
    }
    if (params.from_date) {
      query2 += ` AND fr.created_at >= ?`;
      args.push(params.from_date);
    }
    if (params.to_date) {
      query2 += ` AND fr.created_at <= ?`;
      args.push(params.to_date);
    }
    query2 += ` ORDER BY fr.created_at DESC`;
    return db2.prepare(query2).all(...args);
  });
  ipcMain2.handle("reports:members", async (_event, params = {}) => {
    let query2 = `
      SELECT m.*, mt.name as membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id) as total_borrows,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) as active_loans,
        (SELECT COALESCE(SUM(fr.amount),0) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') as pending_fines
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id WHERE 1=1
    `;
    const args = [];
    if (params.status) {
      query2 += ` AND m.status = ?`;
      args.push(params.status);
    }
    query2 += ` ORDER BY m.full_name`;
    return db2.prepare(query2).all(...args);
  });
  ipcMain2.handle("reports:export", async (_event, data) => {
    const rows = data.rows;
    if (!rows || rows.length === 0)
      return { success: false, error: "No data to export" };
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))
    ].join("\n");
    return { success: true, csv };
  });
}

// electron/ipc/settings.ts
var import_electron2 = require("electron");
var import_path2 = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
function registerSettingsHandlers(ipcMain2, db2) {
  ipcMain2.handle("settings:getAll", async () => {
    return db2.prepare("SELECT * FROM library_settings ORDER BY key").all();
  });
  ipcMain2.handle("settings:update", async (_event, settings) => {
    const stmt = db2.prepare("INSERT INTO library_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')");
    const updateMany = db2.transaction((items) => {
      for (const item of items)
        stmt.run(item.key, item.value);
    });
    updateMany(settings);
    return { success: true };
  });
  ipcMain2.handle("settings:backup", async () => {
    try {
      const userDataPath = import_electron2.app.getPath("userData");
      const dbPath = import_path2.default.join(userDataPath, "library.db");
      const backupPath = import_path2.default.join(userDataPath, `library_backup_${Date.now()}.db`);
      import_fs.default.copyFileSync(dbPath, backupPath);
      return { success: true, path: backupPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain2.handle("settings:resetSampleData", async () => {
    try {
      db2.prepare("DELETE FROM fine_payments").run();
      db2.prepare("DELETE FROM fine_records").run();
      db2.prepare("DELETE FROM return_transactions").run();
      db2.prepare("DELETE FROM issue_transactions").run();
      db2.prepare("DELETE FROM book_copies").run();
      db2.prepare("DELETE FROM books").run();
      db2.prepare("DELETE FROM members").run();
      db2.prepare("DELETE FROM categories").run();
      db2.prepare("DELETE FROM membership_types").run();
      db2.prepare("DELETE FROM sqlite_sequence WHERE name IN (?,?,?,?,?,?,?,?,?)").run(
        "books",
        "book_copies",
        "members",
        "issue_transactions",
        "return_transactions",
        "fine_records",
        "fine_payments",
        "categories",
        "membership_types"
      );
      const userCount = db2.prepare("SELECT COUNT(*) as cnt FROM users").get();
      const tempFlag = db2.prepare("SELECT COUNT(*) as cnt FROM users").get();
      db2.prepare("DELETE FROM users").run();
      db2.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
      db2.prepare("DELETE FROM roles").run();
      db2.prepare("DELETE FROM sqlite_sequence WHERE name = 'roles'").run();
      seedDatabase(db2);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain2.handle("settings:auditLogs", async (_event, params = {}) => {
    let query2 = `
      SELECT al.*, u.full_name as user_name, u.username
      FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const args = [];
    if (params.user_id) {
      query2 += ` AND al.user_id = ?`;
      args.push(params.user_id);
    }
    if (params.action) {
      query2 += ` AND al.action LIKE ?`;
      args.push(`%${params.action}%`);
    }
    if (params.from_date) {
      query2 += ` AND al.created_at >= ?`;
      args.push(params.from_date);
    }
    query2 += ` ORDER BY al.created_at DESC LIMIT 100`;
    return db2.prepare(query2).all(...args);
  });
}

// electron/database/db-config.ts
var import_path3 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_electron3 = require("electron");
var DEFAULT_CONFIG = {
  dbType: process.env.DB_TYPE || "sqlite",
  oracle: {
    user: process.env.ORACLE_USER || "LIBRARY",
    password: process.env.ORACLE_PASSWORD || "library123",
    connectString: process.env.ORACLE_CONNECT || "localhost:1521/XEPDB1",
    poolMin: 2,
    poolMax: 10
  }
};
function loadDbConfig() {
  try {
    const configPath = getConfigFilePath();
    if (import_fs2.default.existsSync(configPath)) {
      const content = import_fs2.default.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        oracle: {
          ...DEFAULT_CONFIG.oracle,
          ...parsed.oracle || {}
        }
      };
    }
  } catch (err) {
    console.error("Could not read db-config.json, using defaults:", err);
  }
  return DEFAULT_CONFIG;
}
function saveDbConfig(config) {
  try {
    const configPath = getConfigFilePath();
    const current = loadDbConfig();
    const updated = {
      ...current,
      ...config,
      oracle: {
        ...current.oracle,
        ...config.oracle || {}
      }
    };
    import_fs2.default.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save db-config.json:", err);
  }
}
function getConfigFilePath() {
  const baseDir = import_electron3.app ? import_electron3.app.getPath("userData") : process.cwd();
  return import_path3.default.join(baseDir, "db-config.json");
}

// electron/database/oracle-init.ts
var import_oracledb = __toESM(require("oracledb"));
async function initDatabase2() {
  const config = loadDbConfig();
  import_oracledb.default.outFormat = import_oracledb.default.OUT_FORMAT_OBJECT;
  import_oracledb.default.autoCommit = false;
  await import_oracledb.default.createPool({
    user: config.oracle.user,
    password: config.oracle.password,
    connectString: config.oracle.connectString,
    poolMin: config.oracle.poolMin || 2,
    poolMax: config.oracle.poolMax || 10,
    poolIncrement: 1
  });
  await createTables2();
}
async function getConnection() {
  return import_oracledb.default.getConnection();
}
async function execDDL(sql) {
  const conn = await getConnection();
  try {
    await conn.execute(sql);
    await conn.commit();
  } catch (err) {
    if (err.errorNum !== 955 && err.errorNum !== 942 && err.errorNum !== 1408) {
      console.warn("Oracle DDL warning:", err.message);
    }
  } finally {
    await conn.close();
  }
}
async function createTables2() {
  await execDDL(`
    CREATE TABLE roles (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        VARCHAR2(50)  NOT NULL UNIQUE,
      description VARCHAR2(255),
      permissions CLOB          NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE users (
      id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      username      VARCHAR2(50)   NOT NULL UNIQUE,
      password_hash VARCHAR2(255)  NOT NULL,
      full_name     VARCHAR2(150)  NOT NULL,
      email         VARCHAR2(150),
      role_id       NUMBER         NOT NULL REFERENCES roles(id),
      is_active     NUMBER(1)      DEFAULT 1 NOT NULL,
      last_login    TIMESTAMP,
      created_at    TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at    TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE categories (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        VARCHAR2(100) NOT NULL UNIQUE,
      description VARCHAR2(500),
      created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE books (
      id               NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title            VARCHAR2(500) NOT NULL,
      isbn             VARCHAR2(20)  UNIQUE,
      author           VARCHAR2(300) NOT NULL,
      publisher        VARCHAR2(200),
      edition          VARCHAR2(50),
      publication_year NUMBER(4),
      category_id      NUMBER REFERENCES categories(id),
      language         VARCHAR2(50)  DEFAULT 'English',
      shelf_number     VARCHAR2(20),
      total_copies     NUMBER        DEFAULT 1 NOT NULL,
      available_copies NUMBER        DEFAULT 1 NOT NULL,
      description      CLOB,
      created_at       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE book_copies (
      id               NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      book_id          NUMBER        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      accession_number VARCHAR2(20)  NOT NULL UNIQUE,
      condition        VARCHAR2(20)  DEFAULT 'Good',
      is_available     NUMBER(1)     DEFAULT 1 NOT NULL,
      notes            VARCHAR2(500),
      created_at       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE membership_types (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        VARCHAR2(50) NOT NULL UNIQUE,
      max_books   NUMBER       DEFAULT 3 NOT NULL,
      loan_days   NUMBER       DEFAULT 14 NOT NULL,
      description VARCHAR2(300)
    )
  `);
  await execDDL(`
    CREATE TABLE members (
      id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      member_id           VARCHAR2(30)  NOT NULL UNIQUE,
      full_name           VARCHAR2(150) NOT NULL,
      registration_number VARCHAR2(50),
      department          VARCHAR2(100),
      course              VARCHAR2(100),
      email               VARCHAR2(150),
      phone               VARCHAR2(20),
      membership_type_id  NUMBER REFERENCES membership_types(id),
      membership_start    DATE,
      membership_expiry   DATE,
      status              VARCHAR2(20)  DEFAULT 'active' NOT NULL,
      notes               VARCHAR2(500),
      created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE issue_transactions (
      id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      member_id     NUMBER    NOT NULL REFERENCES members(id),
      book_copy_id  NUMBER    NOT NULL REFERENCES book_copies(id),
      book_id       NUMBER    NOT NULL REFERENCES books(id),
      issued_by     NUMBER    NOT NULL REFERENCES users(id),
      issue_date    DATE      DEFAULT TRUNC(SYSDATE) NOT NULL,
      due_date      DATE      NOT NULL,
      status        VARCHAR2(20) DEFAULT 'active' NOT NULL,
      renewal_count NUMBER    DEFAULT 0 NOT NULL,
      notes         VARCHAR2(500),
      created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE return_transactions (
      id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      issue_id      NUMBER    NOT NULL REFERENCES issue_transactions(id),
      member_id     NUMBER    NOT NULL REFERENCES members(id),
      book_copy_id  NUMBER    NOT NULL REFERENCES book_copies(id),
      book_id       NUMBER    NOT NULL REFERENCES books(id),
      returned_by   NUMBER    NOT NULL REFERENCES users(id),
      return_date   DATE      DEFAULT TRUNC(SYSDATE) NOT NULL,
      overdue_days  NUMBER    DEFAULT 0 NOT NULL,
      condition     VARCHAR2(20) DEFAULT 'Good',
      notes         VARCHAR2(500),
      created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE fine_records (
      id           NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      issue_id     NUMBER         NOT NULL REFERENCES issue_transactions(id),
      member_id    NUMBER         NOT NULL REFERENCES members(id),
      amount       NUMBER(10,2)   NOT NULL,
      overdue_days NUMBER         DEFAULT 0 NOT NULL,
      status       VARCHAR2(20)   DEFAULT 'pending' NOT NULL,
      waived_reason VARCHAR2(500),
      waived_by    NUMBER REFERENCES users(id),
      created_at   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      updated_at   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE fine_payments (
      id             NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      fine_id        NUMBER       NOT NULL REFERENCES fine_records(id),
      amount         NUMBER(10,2) NOT NULL,
      payment_method VARCHAR2(30) DEFAULT 'cash',
      received_by    NUMBER       NOT NULL REFERENCES users(id),
      payment_date   TIMESTAMP    DEFAULT SYSTIMESTAMP NOT NULL,
      notes          VARCHAR2(500)
    )
  `);
  await execDDL(`
    CREATE TABLE library_settings (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      key_name    VARCHAR2(100) NOT NULL UNIQUE,
      value       VARCHAR2(500) NOT NULL,
      description VARCHAR2(300),
      updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  await execDDL(`
    CREATE TABLE audit_logs (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id     NUMBER REFERENCES users(id),
      action      VARCHAR2(100) NOT NULL,
      entity_type VARCHAR2(50),
      entity_id   NUMBER,
      details     CLOB,
      ip_address  VARCHAR2(50),
      created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `);
  const indexes = [
    `CREATE INDEX idx_books_isbn   ON books(isbn)`,
    `CREATE INDEX idx_books_title  ON books(title)`,
    `CREATE INDEX idx_books_author ON books(author)`,
    `CREATE INDEX idx_copies_acc   ON book_copies(accession_number)`,
    `CREATE INDEX idx_members_mid  ON members(member_id)`,
    `CREATE INDEX idx_issue_member ON issue_transactions(member_id)`,
    `CREATE INDEX idx_issue_status ON issue_transactions(status)`,
    `CREATE INDEX idx_fine_member  ON fine_records(member_id)`,
    `CREATE INDEX idx_fine_status  ON fine_records(status)`,
    `CREATE INDEX idx_audit_user   ON audit_logs(user_id)`
  ];
  for (const sql of indexes) {
    await execDDL(sql);
  }
}

// electron/database/oracle-seed.ts
var import_oracledb2 = __toESM(require("oracledb"));
var import_bcryptjs3 = __toESM(require("bcryptjs"));
async function exec(sql, binds = []) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, { autoCommit: true });
    return result;
  } finally {
    await conn.close();
  }
}
async function query(sql, binds = []) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, { outFormat: import_oracledb2.default.OUT_FORMAT_OBJECT });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}
async function seedDatabase2() {
  const rows = await query(`SELECT COUNT(*) AS CNT FROM users`);
  if (rows[0].CNT > 0)
    return;
  const rolesSql = `INSERT INTO roles (name, description, permissions) VALUES (:1, :2, :3)`;
  await exec(rolesSql, ["administrator", "Full system access", JSON.stringify(["*"])]);
  await exec(rolesSql, ["librarian", "Manage books, members, circulation", JSON.stringify(["books", "members", "circulation", "fines", "reports"])]);
  await exec(rolesSql, ["assistant_librarian", "Limited circulation operations", JSON.stringify(["books:read", "members:read", "circulation:issue", "circulation:return"])]);
  const adminHash = import_bcryptjs3.default.hashSync("admin123", 10);
  const libHash = import_bcryptjs3.default.hashSync("lib123", 10);
  const assistHash = import_bcryptjs3.default.hashSync("assist123", 10);
  const userSql = `INSERT INTO users (username, password_hash, full_name, email, role_id) VALUES (:1, :2, :3, :4, :5)`;
  await exec(userSql, ["admin", adminHash, "System Administrator", "admin@library.edu", 1]);
  await exec(userSql, ["librarian", libHash, "Ms. Priya Sharma", "priya.sharma@library.edu", 2]);
  await exec(userSql, ["assistant", assistHash, "Mr. Ravi Kumar", "ravi.kumar@library.edu", 3]);
  const settingsSql = `INSERT INTO library_settings (key_name, value, description) VALUES (:1, :2, :3)`;
  const settings = [
    ["library_name", "Vidyasagar College Library", "Name of the library"],
    ["library_address", "42 College Road, Pune, Maharashtra 411001", "Library address"],
    ["library_phone", "+91 20 2345 6789", "Library phone number"],
    ["library_email", "library@vidyasagar.edu", "Library email"],
    ["fine_per_day", "2.00", "Fine amount per overdue day in rupees"],
    ["max_loan_days", "14", "Default maximum loan duration in days"],
    ["max_books_per_member", "3", "Default maximum books per member"],
    ["renewal_limit", "2", "Maximum number of renewals per loan"],
    ["renewal_days", "7", "Additional days added per renewal"],
    ["currency_symbol", "\u20B9", "Currency symbol"],
    ["academic_year", "2025-2026", "Current academic year"]
  ];
  for (const s of settings)
    await exec(settingsSql, s);
  const mtSql = `INSERT INTO membership_types (name, max_books, loan_days, description) VALUES (:1, :2, :3, :4)`;
  await exec(mtSql, ["Student", 3, 14, "Undergraduate and postgraduate students"]);
  await exec(mtSql, ["Faculty", 10, 30, "Teaching and non-teaching staff"]);
  await exec(mtSql, ["Research Scholar", 6, 21, "PhD and research scholars"]);
  await exec(mtSql, ["Staff", 5, 14, "Administrative staff"]);
  const catSql = `INSERT INTO categories (name) VALUES (:1)`;
  const categories = [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Engineering",
    "Management",
    "Economics",
    "Literature",
    "History",
    "Psychology",
    "Philosophy",
    "Law",
    "Medicine",
    "Reference"
  ];
  for (const c of categories)
    await exec(catSql, [c]);
  const catRows = await query(`SELECT id, name FROM categories ORDER BY id`);
  const catMap = {};
  for (const r of catRows)
    catMap[r.NAME] = r.ID;
  const books = [
    { title: "Introduction to Algorithms", isbn: "9780262033848", author: "Cormen, Leiserson, Rivest, Stein", publisher: "MIT Press", edition: "4th", year: 2022, cat: "Computer Science", shelf: "CS-A1", copies: 3 },
    { title: "The Pragmatic Programmer", isbn: "9780135957059", author: "David Thomas, Andrew Hunt", publisher: "Addison-Wesley", edition: "20th Anniversary", year: 2019, cat: "Computer Science", shelf: "CS-A2", copies: 2 },
    { title: "Clean Code", isbn: "9780132350884", author: "Robert C. Martin", publisher: "Prentice Hall", edition: "1st", year: 2008, cat: "Computer Science", shelf: "CS-A3", copies: 2 },
    { title: "Design Patterns: Elements of Reusable Object-Oriented Software", isbn: "9780201633610", author: "Gang of Four", publisher: "Addison-Wesley", edition: "1st", year: 1994, cat: "Computer Science", shelf: "CS-A4", copies: 1 },
    { title: "Computer Networks", isbn: "9780133594676", author: "Andrew S. Tanenbaum", publisher: "Pearson", edition: "5th", year: 2010, cat: "Computer Science", shelf: "CS-B1", copies: 4 },
    { title: "Operating System Concepts", isbn: "9781119800361", author: "Silberschatz, Galvin, Gagne", publisher: "Wiley", edition: "10th", year: 2018, cat: "Computer Science", shelf: "CS-B2", copies: 3 },
    { title: "Database System Concepts", isbn: "9780078022159", author: "Silberschatz, Korth, Sudarshan", publisher: "McGraw-Hill", edition: "7th", year: 2019, cat: "Computer Science", shelf: "CS-B3", copies: 2 },
    { title: "Artificial Intelligence: A Modern Approach", isbn: "9780134610993", author: "Stuart Russell, Peter Norvig", publisher: "Pearson", edition: "4th", year: 2020, cat: "Computer Science", shelf: "CS-C1", copies: 3 },
    { title: "Calculus: Early Transcendentals", isbn: "9781285741550", author: "James Stewart", publisher: "Cengage Learning", edition: "8th", year: 2015, cat: "Mathematics", shelf: "MA-A1", copies: 5 },
    { title: "Linear Algebra and Its Applications", isbn: "9780321982384", author: "David Lay", publisher: "Pearson", edition: "5th", year: 2015, cat: "Mathematics", shelf: "MA-A2", copies: 3 },
    { title: "Discrete Mathematics and Its Applications", isbn: "9780073383095", author: "Kenneth Rosen", publisher: "McGraw-Hill", edition: "8th", year: 2018, cat: "Mathematics", shelf: "MA-B1", copies: 4 },
    { title: "University Physics", isbn: "9780133969290", author: "Young, Freedman", publisher: "Pearson", edition: "14th", year: 2015, cat: "Physics", shelf: "PH-A1", copies: 4 },
    { title: "Modern Physics", isbn: "9781133103721", author: "Paul A. Tipler", publisher: "W.H. Freeman", edition: "6th", year: 2012, cat: "Physics", shelf: "PH-A2", copies: 2 },
    { title: "Organic Chemistry", isbn: "9781305580350", author: "John McMurry", publisher: "Cengage", edition: "9th", year: 2015, cat: "Chemistry", shelf: "CH-A1", copies: 3 },
    { title: "Physical Chemistry", isbn: "9780198816461", author: "Peter Atkins, Julio de Paula", publisher: "Oxford", edition: "11th", year: 2017, cat: "Chemistry", shelf: "CH-B1", copies: 2 },
    { title: "Engineering Mathematics", isbn: "9780230364004", author: "K.A. Stroud", publisher: "Palgrave Macmillan", edition: "7th", year: 2013, cat: "Engineering", shelf: "EN-A1", copies: 6 },
    { title: "Principles of Management", isbn: "9781259894343", author: "Harold Koontz", publisher: "McGraw-Hill", edition: "12th", year: 2017, cat: "Management", shelf: "MG-A1", copies: 4 },
    { title: "Financial Management", isbn: "9789388002936", author: "I.M. Pandey", publisher: "Vikas", edition: "12th", year: 2021, cat: "Management", shelf: "MG-B1", copies: 3 },
    { title: "Microeconomics", isbn: "9780393603583", author: "Robert S. Pindyck", publisher: "Pearson", edition: "9th", year: 2017, cat: "Economics", shelf: "EC-A1", copies: 3 },
    { title: "Macroeconomics", isbn: "9781319105990", author: "N. Gregory Mankiw", publisher: "Worth Publishers", edition: "10th", year: 2019, cat: "Economics", shelf: "EC-B1", copies: 4 },
    { title: "The Great Gatsby", isbn: "9780743273565", author: "F. Scott Fitzgerald", publisher: "Scribner", edition: "Reprint", year: 2004, cat: "Literature", shelf: "LT-A1", copies: 2 },
    { title: "To Kill a Mockingbird", isbn: "9780061935466", author: "Harper Lee", publisher: "HarperCollins", edition: "50th Anniversary", year: 2010, cat: "Literature", shelf: "LT-A2", copies: 2 },
    { title: "A Brief History of Time", isbn: "9780553380163", author: "Stephen Hawking", publisher: "Bantam Books", edition: "Updated", year: 1998, cat: "Physics", shelf: "PH-C1", copies: 3 },
    { title: "Sapiens: A Brief History of Humankind", isbn: "9780062316097", author: "Yuval Noah Harari", publisher: "Harper", edition: "1st", year: 2015, cat: "History", shelf: "HI-A1", copies: 4 },
    { title: "Introduction to Psychology", isbn: "9780495810919", author: "Rod Plotnik", publisher: "Cengage", edition: "9th", year: 2010, cat: "Psychology", shelf: "PS-A1", copies: 3 },
    { title: "The Republic", isbn: "9780140455113", author: "Plato", publisher: "Penguin Classics", edition: "Reprint", year: 2007, cat: "Philosophy", shelf: "PH-A1", copies: 2 },
    { title: "Introduction to Law", isbn: "9780199688333", author: "Penner, Shute, Nobles", publisher: "Oxford", edition: "2nd", year: 2012, cat: "Law", shelf: "LW-A1", copies: 2 },
    { title: "Gray's Anatomy", isbn: "9780702052309", author: "Henry Gray", publisher: "Elsevier", edition: "42nd", year: 2020, cat: "Medicine", shelf: "ME-A1", copies: 2 },
    { title: "Business Communication", isbn: "9789387383258", author: "Bovee, Thill", publisher: "Pearson", edition: "12th", year: 2018, cat: "Management", shelf: "MG-C1", copies: 3 },
    { title: "Data Structures Using C", isbn: "9780198066408", author: "Reema Thareja", publisher: "Oxford", edition: "2nd", year: 2014, cat: "Computer Science", shelf: "CS-D1", copies: 4 }
  ];
  const bookSql = `
    INSERT INTO books (title, isbn, author, publisher, edition, publication_year, category_id, shelf_number, total_copies, available_copies)
    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10)
  `;
  const copySql = `INSERT INTO book_copies (book_id, accession_number, condition) VALUES (:1, :2, 'Good')`;
  const bookIds = [];
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const result = await exec(bookSql, [
      b.title,
      b.isbn,
      b.author,
      b.publisher,
      b.edition,
      b.year,
      catMap[b.cat] || null,
      b.shelf,
      b.copies,
      b.copies
    ]);
    const idRows = await query(`SELECT id FROM books WHERE isbn = :1`, [b.isbn]);
    const bookId = idRows[0]?.ID;
    if (bookId) {
      bookIds.push(bookId);
      for (let c = 1; c <= b.copies; c++) {
        const accNum = `ACC${String(i + 1).padStart(4, "0")}${String(c).padStart(2, "0")}`;
        await exec(copySql, [bookId, accNum]);
      }
    }
  }
  const members = [
    { mid: "MEM-2024-001", name: "Aarav Mehta", reg: "REG2021CS001", dept: "Computer Science", course: "B.Tech", email: "aarav.m@student.edu", phone: "9876543201", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-002", name: "Priya Nair", reg: "REG2021CS002", dept: "Computer Science", course: "B.Tech", email: "priya.n@student.edu", phone: "9876543202", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-003", name: "Rohit Gupta", reg: "REG2021MA001", dept: "Mathematics", course: "B.Sc", email: "rohit.g@student.edu", phone: "9876543203", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-004", name: "Sneha Iyer", reg: "REG2022EC001", dept: "Economics", course: "M.A.", email: "sneha.i@student.edu", phone: "9876543204", type: 1, start: "2024-07-01", expiry: "2025-06-30" },
    { mid: "MEM-2024-005", name: "Vikram Rao", reg: "REG2020PH001", dept: "Physics", course: "M.Sc", email: "vikram.r@student.edu", phone: "9876543205", type: 3, start: "2024-01-01", expiry: "2026-12-31" },
    { mid: "MEM-2024-006", name: "Anita Singh", reg: "FAC001", dept: "Chemistry", course: "Professor", email: "anita.s@faculty.edu", phone: "9876543206", type: 2, start: "2024-04-01", expiry: "2025-03-31" },
    { mid: "MEM-2024-007", name: "Dr. Rajan Krishnan", reg: "FAC002", dept: "Computer Science", course: "Associate Professor", email: "rajan.k@faculty.edu", phone: "9876543207", type: 2, start: "2024-04-01", expiry: "2025-03-31" },
    { mid: "MEM-2024-008", name: "Kavya Reddy", reg: "REG2022MG001", dept: "Management", course: "MBA", email: "kavya.r@student.edu", phone: "9876543208", type: 1, start: "2024-07-01", expiry: "2025-06-30" },
    { mid: "MEM-2024-009", name: "Arjun Desai", reg: "REG2021EN001", dept: "Engineering", course: "B.Tech", email: "arjun.d@student.edu", phone: "9876543209", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-010", name: "Meera Pillai", reg: "PHD001", dept: "Physics", course: "PhD Scholar", email: "meera.p@research.edu", phone: "9876543210", type: 3, start: "2024-01-01", expiry: "2027-12-31" },
    { mid: "MEM-2024-011", name: "Siddharth Joshi", reg: "REG2023CS001", dept: "Computer Science", course: "B.Tech", email: "sid.j@student.edu", phone: "9876543211", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-012", name: "Deepika Nambiar", reg: "STF001", dept: "Administration", course: "Administrative Staff", email: "deepika.n@admin.edu", phone: "9876543212", type: 4, start: "2024-04-01", expiry: "2025-03-31" },
    { mid: "MEM-2024-013", name: "Arun Patel", reg: "REG2022CH001", dept: "Chemistry", course: "M.Sc", email: "arun.p@student.edu", phone: "9876543213", type: 1, start: "2024-07-01", expiry: "2025-06-30" },
    { mid: "MEM-2024-014", name: "Nisha Thomas", reg: "REG2021EC001", dept: "Economics", course: "B.A.", email: "nisha.t@student.edu", phone: "9876543214", type: 1, start: "2024-06-01", expiry: "2025-05-31" },
    { mid: "MEM-2024-015", name: "Karan Shah", reg: "REG2020CS003", dept: "Computer Science", course: "M.Tech", email: "karan.s@student.edu", phone: "9876543215", type: 1, start: "2024-06-01", expiry: "2025-05-31" }
  ];
  const memberSql = `
    INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone, membership_type_id, membership_start, membership_expiry, status)
    VALUES (:1, :2, :3, :4, :5, :6, :7, :8, TO_DATE(:9,'YYYY-MM-DD'), TO_DATE(:10,'YYYY-MM-DD'), 'active')
  `;
  for (const m of members) {
    await exec(memberSql, [m.mid, m.name, m.reg, m.dept, m.course, m.email, m.phone, m.type, m.start, m.expiry]);
  }
  async function getCopyId(accNum) {
    const rows2 = await query(`SELECT id, book_id FROM book_copies WHERE accession_number = :1`, [accNum]);
    return rows2.length ? rows2[0] : null;
  }
  async function getMemberId(mid) {
    const rows2 = await query(`SELECT id FROM members WHERE member_id = :1`, [mid]);
    return rows2.length ? rows2[0].ID : null;
  }
  const today = /* @__PURE__ */ new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const ago = (n6) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - n6);
    return fmt(d);
  };
  const from = (n6) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + n6);
    return fmt(d);
  };
  const issueSql = `
    INSERT INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
    VALUES (:1, :2, :3, 1, TO_DATE(:4,'YYYY-MM-DD'), TO_DATE(:5,'YYYY-MM-DD'), :6)
  `;
  const activeLoans = [
    { acc: "ACC000101", mid: "MEM-2024-001", issue: ago(5), due: from(9) },
    { acc: "ACC000201", mid: "MEM-2024-002", issue: ago(10), due: from(4) },
    { acc: "ACC000501", mid: "MEM-2024-007", issue: ago(7), due: from(23) },
    { acc: "ACC000901", mid: "MEM-2024-009", issue: ago(3), due: from(11) },
    { acc: "ACC001601", mid: "MEM-2024-006", issue: ago(12), due: from(18) }
  ];
  for (const l of activeLoans) {
    const copy = await getCopyId(l.acc);
    const memId = await getMemberId(l.mid);
    if (!copy || !memId)
      continue;
    await exec(issueSql, [memId, copy.ID, copy.BOOK_ID, l.issue, l.due, "active"]);
    await exec(`UPDATE book_copies SET is_available = 0 WHERE accession_number = :1`, [l.acc]);
    await exec(`UPDATE books SET available_copies = available_copies - 1 WHERE id = :1`, [copy.BOOK_ID]);
  }
  const overdueLoans = [
    { acc: "ACC000301", mid: "MEM-2024-003", issue: ago(20), due: ago(6), overdueDays: 6 },
    { acc: "ACC000601", mid: "MEM-2024-008", issue: ago(25), due: ago(11), overdueDays: 11 },
    { acc: "ACC001201", mid: "MEM-2024-015", issue: ago(18), due: ago(4), overdueDays: 4 }
  ];
  for (const l of overdueLoans) {
    const copy = await getCopyId(l.acc);
    const memId = await getMemberId(l.mid);
    if (!copy || !memId)
      continue;
    const r = await exec(issueSql, [memId, copy.ID, copy.BOOK_ID, l.issue, l.due, "overdue"]);
    const issRows = await query(
      `SELECT id FROM issue_transactions WHERE member_id=:1 AND book_copy_id=:2 AND status='overdue' ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
      [memId, copy.ID]
    );
    const issueId = issRows[0]?.ID;
    await exec(`UPDATE book_copies SET is_available = 0 WHERE accession_number = :1`, [l.acc]);
    await exec(`UPDATE books SET available_copies = available_copies - 1 WHERE id = :1`, [copy.BOOK_ID]);
    if (issueId) {
      await exec(
        `INSERT INTO fine_records (issue_id, member_id, amount, overdue_days, status) VALUES (:1, :2, :3, :4, 'pending')`,
        [issueId, memId, l.overdueDays * 2, l.overdueDays]
      );
    }
  }
  const returnedLoans = [
    { acc: "ACC000701", mid: "MEM-2024-004", issue: ago(45), due: ago(31), ret: ago(28) },
    { acc: "ACC001001", mid: "MEM-2024-005", issue: ago(50), due: ago(36), ret: ago(34) },
    { acc: "ACC000401", mid: "MEM-2024-013", issue: ago(35), due: ago(21), ret: ago(19) },
    { acc: "ACC001401", mid: "MEM-2024-014", issue: ago(30), due: ago(16), ret: ago(15) },
    { acc: "ACC002101", mid: "MEM-2024-001", issue: ago(70), due: ago(56), ret: ago(55) },
    { acc: "ACC001901", mid: "MEM-2024-012", issue: ago(40), due: ago(26), ret: ago(20) }
  ];
  for (const l of returnedLoans) {
    const copy = await getCopyId(l.acc);
    const memId = await getMemberId(l.mid);
    if (!copy || !memId)
      continue;
    await exec(issueSql, [memId, copy.ID, copy.BOOK_ID, l.issue, l.due, "returned"]);
    const issRows = await query(
      `SELECT id FROM issue_transactions WHERE member_id=:1 AND book_copy_id=:2 AND status='returned' ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
      [memId, copy.ID]
    );
    const issueId = issRows[0]?.ID;
    if (issueId) {
      await exec(
        `INSERT INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days)
         VALUES (:1, :2, :3, :4, 1, TO_DATE(:5,'YYYY-MM-DD'), 0)`,
        [issueId, memId, copy.ID, copy.BOOK_ID, l.ret]
      );
    }
  }
}

// electron/ipc/oracle-auth.ts
var import_oracledb3 = __toESM(require("oracledb"));
var import_bcryptjs4 = __toESM(require("bcryptjs"));
async function q(sql, binds = []) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, { outFormat: import_oracledb3.default.OUT_FORMAT_OBJECT });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}
async function x(sql, binds = []) {
  const conn = await getConnection();
  try {
    return await conn.execute(sql, binds, { autoCommit: true });
  } finally {
    await conn.close();
  }
}
function registerAuthHandlers2(ipcMain2) {
  ipcMain2.handle("auth:login", async (_e, { username, password }) => {
    const rows = await q(`
      SELECT u.*, r.name AS role_name, r.permissions
      FROM users u JOIN roles r ON u.role_id = r.id
      WHERE u.username = :1 AND u.is_active = 1
    `, [username]);
    const user = rows[0];
    if (!user)
      return { success: false, error: "Invalid username or password" };
    const valid = import_bcryptjs4.default.compareSync(password, user.PASSWORD_HASH);
    if (!valid)
      return { success: false, error: "Invalid username or password" };
    await x(`UPDATE users SET last_login = SYSTIMESTAMP WHERE id = :1`, [user.ID]);
    await x(
      `INSERT INTO audit_logs (user_id, action, details) VALUES (:1, 'LOGIN', :2)`,
      [user.ID, JSON.stringify({ username })]
    );
    return {
      success: true,
      user: {
        id: user.ID,
        username: user.USERNAME,
        fullName: user.FULL_NAME,
        email: user.EMAIL,
        role: user.ROLE_NAME,
        permissions: JSON.parse(user.PERMISSIONS)
      }
    };
  });
  ipcMain2.handle("auth:logout", async () => ({ success: true }));
  ipcMain2.handle("auth:changePassword", async (_e, { userId, oldPassword, newPassword }) => {
    const rows = await q(`SELECT * FROM users WHERE id = :1`, [userId]);
    const user = rows[0];
    if (!user)
      return { success: false, error: "User not found" };
    if (!import_bcryptjs4.default.compareSync(oldPassword, user.PASSWORD_HASH))
      return { success: false, error: "Current password is incorrect" };
    const hash = import_bcryptjs4.default.hashSync(newPassword, 10);
    await x(`UPDATE users SET password_hash = :1, updated_at = SYSTIMESTAMP WHERE id = :2`, [hash, userId]);
    return { success: true };
  });
  ipcMain2.handle("auth:getUsers", async () => {
    return q(`
      SELECT u.id, u.username, u.full_name, u.email, u.is_active,
             u.last_login, u.created_at, r.name AS role_name, r.id AS role_id
      FROM users u JOIN roles r ON u.role_id = r.id
      ORDER BY u.full_name
    `);
  });
  ipcMain2.handle("auth:createUser", async (_e, data) => {
    const ex = await q(`SELECT id FROM users WHERE username = :1`, [data.username]);
    if (ex.length)
      return { success: false, error: "Username already exists" };
    const hash = import_bcryptjs4.default.hashSync(data.password, 10);
    await x(
      `INSERT INTO users (username, password_hash, full_name, email, role_id) VALUES (:1, :2, :3, :4, :5)`,
      [data.username, hash, data.full_name, data.email || null, data.role_id]
    );
    const rows = await q(`SELECT id FROM users WHERE username = :1`, [data.username]);
    return { success: true, id: rows[0]?.ID };
  });
  ipcMain2.handle("auth:updateUser", async (_e, data) => {
    await x(
      `UPDATE users SET full_name=:1, email=:2, role_id=:3, is_active=:4, updated_at=SYSTIMESTAMP WHERE id=:5`,
      [data.full_name, data.email || null, data.role_id, data.is_active, data.id]
    );
    return { success: true };
  });
  ipcMain2.handle("auth:deleteUser", async (_e, id) => {
    await x(`UPDATE users SET is_active = 0 WHERE id = :1`, [id]);
    return { success: true };
  });
}

// electron/ipc/oracle-books.ts
var import_oracledb4 = __toESM(require("oracledb"));
async function q2(sql, binds = []) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, { outFormat: import_oracledb4.default.OUT_FORMAT_OBJECT });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}
async function x2(sql, binds = []) {
  const conn = await getConnection();
  try {
    return await conn.execute(sql, binds, { autoCommit: true });
  } finally {
    await conn.close();
  }
}
function registerBookHandlers2(ipcMain2) {
  ipcMain2.handle("books:getAll", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bindIdx = 1;
    if (params.search) {
      const s = `%${params.search}%`;
      where += ` AND (UPPER(b.title) LIKE UPPER(:${bindIdx}) OR UPPER(b.author) LIKE UPPER(:${bindIdx + 1}) OR b.isbn LIKE :${bindIdx + 2} OR UPPER(b.publisher) LIKE UPPER(:${bindIdx + 3}))`;
      binds.push(s, s, s, s);
      bindIdx += 4;
    }
    if (params.category_id) {
      where += ` AND b.category_id = :${bindIdx}`;
      binds.push(params.category_id);
      bindIdx++;
    }
    if (params.availability === "available") {
      where += ` AND b.available_copies > 0`;
    }
    if (params.availability === "unavailable") {
      where += ` AND b.available_copies = 0`;
    }
    const countRows = await q2(
      `SELECT COUNT(*) AS TOTAL FROM books b LEFT JOIN categories c ON b.category_id = c.id ${where}`,
      binds
    );
    const total = countRows[0].TOTAL;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const rows = await q2(`
      SELECT b.*, c.name AS category_name
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      ${where}
      ORDER BY b.title
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit]);
    const books = rows.map((r) => normalise(r));
    return { books, total, page, limit };
  });
  ipcMain2.handle("books:getOne", async (_e, id) => {
    const rows = await q2(`
      SELECT b.*, c.name AS category_name
      FROM books b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = :1
    `, [id]);
    return rows.length ? normalise(rows[0]) : null;
  });
  ipcMain2.handle("books:create", async (_e, data) => {
    if (data.isbn) {
      const ex = await q2(`SELECT id FROM books WHERE isbn = :1`, [data.isbn]);
      if (ex.length)
        return { success: false, error: "A book with this ISBN already exists" };
    }
    await x2(`
      INSERT INTO books (title, isbn, author, publisher, edition, publication_year, category_id, language, shelf_number, total_copies, available_copies, description)
      VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12)
    `, [
      data.title,
      data.isbn || null,
      data.author,
      data.publisher || null,
      data.edition || null,
      data.publication_year || null,
      data.category_id || null,
      data.language || "English",
      data.shelf_number || null,
      data.total_copies || 1,
      data.total_copies || 1,
      data.description || null
    ]);
    const rows = await q2(`SELECT id FROM books WHERE isbn = :1`, [data.isbn || ""]);
    let bookId;
    if (rows.length) {
      bookId = rows[0].ID;
    } else {
      const r2 = await q2(`SELECT id FROM books WHERE title=:1 AND author=:2 ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`, [data.title, data.author]);
      bookId = r2[0]?.ID;
    }
    for (let i = 1; i <= (data.total_copies || 1); i++) {
      const accNum = `ACC${String(bookId).padStart(4, "0")}${String(i).padStart(2, "0")}`;
      await x2(`INSERT INTO book_copies (book_id, accession_number) VALUES (:1, :2)`, [bookId, accNum]);
    }
    return { success: true, id: bookId };
  });
  ipcMain2.handle("books:update", async (_e, data) => {
    if (data.isbn) {
      const ex = await q2(`SELECT id FROM books WHERE isbn = :1 AND id != :2`, [data.isbn, data.id]);
      if (ex.length)
        return { success: false, error: "Another book with this ISBN already exists" };
    }
    await x2(`
      UPDATE books SET title=:1, isbn=:2, author=:3, publisher=:4, edition=:5, publication_year=:6,
        category_id=:7, language=:8, shelf_number=:9, description=:10, updated_at=SYSTIMESTAMP
      WHERE id=:11
    `, [
      data.title,
      data.isbn || null,
      data.author,
      data.publisher || null,
      data.edition || null,
      data.publication_year || null,
      data.category_id || null,
      data.language || "English",
      data.shelf_number || null,
      data.description || null,
      data.id
    ]);
    return { success: true };
  });
  ipcMain2.handle("books:delete", async (_e, id) => {
    const active = await q2(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE book_id=:1 AND status IN ('active','overdue')`, [id]);
    if (active[0].CNT > 0)
      return { success: false, error: "Cannot delete book with active loans" };
    await x2(`DELETE FROM books WHERE id = :1`, [id]);
    return { success: true };
  });
  ipcMain2.handle("books:getCategories", async () => {
    const rows = await q2(`SELECT * FROM categories ORDER BY name`);
    return rows.map((r) => normalise(r));
  });
  ipcMain2.handle("books:createCategory", async (_e, name) => {
    await x2(`INSERT INTO categories (name) VALUES (:1)`, [name]);
    const rows = await q2(`SELECT id FROM categories WHERE name = :1`, [name]);
    return { success: true, id: rows[0]?.ID };
  });
  ipcMain2.handle("books:getCopies", async (_e, bookId) => {
    const rows = await q2(`
      SELECT bc.*,
        CASE WHEN it.id IS NOT NULL THEN m.full_name ELSE NULL END AS borrowed_by,
        CASE WHEN it.id IS NOT NULL THEN TO_CHAR(it.due_date,'YYYY-MM-DD') ELSE NULL END AS due_date,
        CASE WHEN it.id IS NOT NULL THEN m.member_id ELSE NULL END AS member_code
      FROM book_copies bc
      LEFT JOIN issue_transactions it ON it.book_copy_id = bc.id AND it.status IN ('active','overdue')
      LEFT JOIN members m ON it.member_id = m.id
      WHERE bc.book_id = :1
      ORDER BY bc.accession_number
    `, [bookId]);
    return rows.map((r) => normalise(r));
  });
  ipcMain2.handle("books:getHistory", async (_e, bookId) => {
    const rows = await q2(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, bc.accession_number,
             TO_CHAR(rt.return_date,'YYYY-MM-DD') AS return_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      LEFT JOIN return_transactions rt ON rt.issue_id = it.id
      WHERE it.book_id = :1
      ORDER BY it.created_at DESC
      FETCH FIRST 50 ROWS ONLY
    `, [bookId]);
    return rows.map((r) => normalise(r));
  });
}
function normalise(row) {
  if (!row)
    return row;
  const out = {};
  for (const k of Object.keys(row)) {
    out[k.toLowerCase()] = row[k];
  }
  return out;
}

// electron/ipc/oracle-members.ts
var import_oracledb5 = __toESM(require("oracledb"));
async function q3(sql, binds = []) {
  const conn = await getConnection();
  try {
    const r = await conn.execute(sql, binds, { outFormat: import_oracledb5.default.OUT_FORMAT_OBJECT });
    return r.rows || [];
  } finally {
    await conn.close();
  }
}
async function x3(sql, binds = []) {
  const conn = await getConnection();
  try {
    return await conn.execute(sql, binds, { autoCommit: true });
  } finally {
    await conn.close();
  }
}
function n(row) {
  if (!row)
    return row;
  const out = {};
  for (const k of Object.keys(row))
    out[k.toLowerCase()] = row[k];
  return out;
}
function registerMemberHandlers2(ipcMain2) {
  ipcMain2.handle("members:getAll", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bi = 1;
    if (params.search) {
      const s = `%${params.search}%`;
      where += ` AND (UPPER(m.full_name) LIKE UPPER(:${bi}) OR m.member_id LIKE :${bi + 1} OR m.registration_number LIKE :${bi + 2} OR m.email LIKE :${bi + 3} OR m.phone LIKE :${bi + 4})`;
      binds.push(s, s, s, s, s);
      bi += 5;
    }
    if (params.status) {
      where += ` AND m.status = :${bi}`;
      binds.push(params.status);
      bi++;
    }
    if (params.membership_type_id) {
      where += ` AND m.membership_type_id = :${bi}`;
      binds.push(params.membership_type_id);
      bi++;
    }
    if (params.department) {
      where += ` AND UPPER(m.department) LIKE UPPER(:${bi})`;
      binds.push(`%${params.department}%`);
      bi++;
    }
    const countRows = await q3(
      `SELECT COUNT(*) AS TOTAL FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id ${where}`,
      binds
    );
    const total = countRows[0].TOTAL;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const rows = await q3(`
      SELECT m.*, mt.name AS membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) AS active_loans,
        (SELECT COUNT(*) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') AS pending_fines
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      ${where}
      ORDER BY m.full_name
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit]);
    return { members: rows.map(n), total, page, limit };
  });
  ipcMain2.handle("members:getOne", async (_e, id) => {
    const rows = await q3(`
      SELECT m.*, mt.name AS membership_type_name, mt.max_books, mt.loan_days
      FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      WHERE m.id = :1
    `, [id]);
    return rows.length ? n(rows[0]) : null;
  });
  ipcMain2.handle("members:create", async (_e, data) => {
    const ex = await q3(`SELECT id FROM members WHERE member_id = :1`, [data.member_id]);
    if (ex.length)
      return { success: false, error: "Member ID already exists" };
    await x3(`
      INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone,
        membership_type_id, membership_start, membership_expiry, status, notes)
      VALUES (:1, :2, :3, :4, :5, :6, :7, :8,
        ${data.membership_start ? `TO_DATE(:9,'YYYY-MM-DD')` : "NULL"},
        ${data.membership_expiry ? `TO_DATE(:10,'YYYY-MM-DD')` : "NULL"},
        :11, :12)
    `, [
      data.member_id,
      data.full_name,
      data.registration_number || null,
      data.department || null,
      data.course || null,
      data.email || null,
      data.phone || null,
      data.membership_type_id || null,
      ...data.membership_start ? [data.membership_start] : [],
      ...data.membership_expiry ? [data.membership_expiry] : [],
      data.status || "active",
      data.notes || null
    ]);
    await x3(`DELETE FROM members WHERE member_id = :1`, [data.member_id]);
    await x3(`
      INSERT INTO members (member_id, full_name, registration_number, department, course, email, phone,
        membership_type_id, membership_start, membership_expiry, status, notes)
      VALUES (:1, :2, :3, :4, :5, :6, :7, :8, 
        TO_DATE(NULLIF(:9,''), 'YYYY-MM-DD'), TO_DATE(NULLIF(:10,''), 'YYYY-MM-DD'),
        :11, :12)
    `, [
      data.member_id,
      data.full_name,
      data.registration_number || null,
      data.department || null,
      data.course || null,
      data.email || null,
      data.phone || null,
      data.membership_type_id || null,
      data.membership_start || "",
      data.membership_expiry || "",
      data.status || "active",
      data.notes || null
    ]);
    const rows = await q3(`SELECT id FROM members WHERE member_id = :1`, [data.member_id]);
    return { success: true, id: rows[0]?.ID };
  });
  ipcMain2.handle("members:update", async (_e, data) => {
    await x3(`
      UPDATE members SET full_name=:1, registration_number=:2, department=:3, course=:4,
        email=:5, phone=:6, membership_type_id=:7,
        membership_start=TO_DATE(NULLIF(:8,''),'YYYY-MM-DD'),
        membership_expiry=TO_DATE(NULLIF(:9,''),'YYYY-MM-DD'),
        status=:10, notes=:11, updated_at=SYSTIMESTAMP
      WHERE id=:12
    `, [
      data.full_name,
      data.registration_number || null,
      data.department || null,
      data.course || null,
      data.email || null,
      data.phone || null,
      data.membership_type_id || null,
      data.membership_start || "",
      data.membership_expiry || "",
      data.status,
      data.notes || null,
      data.id
    ]);
    return { success: true };
  });
  ipcMain2.handle("members:delete", async (_e, id) => {
    const active = await q3(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE member_id=:1 AND status IN ('active','overdue')`, [id]);
    if (active[0].CNT > 0)
      return { success: false, error: "Cannot delete member with active loans" };
    await x3(`UPDATE members SET status='deactivated' WHERE id=:1`, [id]);
    return { success: true };
  });
  ipcMain2.handle("members:getMembershipTypes", async () => {
    const rows = await q3(`SELECT * FROM membership_types ORDER BY name`);
    return rows.map(n);
  });
  ipcMain2.handle("members:getHistory", async (_e, memberId) => {
    const rows = await q3(`
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
    `, [memberId]);
    return rows.map(n);
  });
  ipcMain2.handle("members:getActiveLoans", async (_e, memberId) => {
    const rows = await q3(`
      SELECT it.*, b.title, b.author, bc.accession_number
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.member_id = :1 AND it.status IN ('active','overdue')
    `, [memberId]);
    return rows.map(n);
  });
}

// electron/ipc/oracle-circulation.ts
var import_oracledb6 = __toESM(require("oracledb"));
async function q4(sql, binds = []) {
  const conn = await getConnection();
  try {
    const r = await conn.execute(sql, binds, { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT });
    return r.rows || [];
  } finally {
    await conn.close();
  }
}
function n2(row) {
  if (!row)
    return row;
  const out = {};
  for (const k of Object.keys(row))
    out[k.toLowerCase()] = row[k];
  return out;
}
function registerCirculationHandlers2(ipcMain2) {
  ipcMain2.handle("circulation:issue", async (_e, data) => {
    const conn = await getConnection();
    try {
      const mRows = await conn.execute(`
        SELECT m.*, mt.max_books, mt.loan_days
        FROM members m LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
        WHERE m.id = :1
      `, [data.member_id], { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT });
      const member = (mRows.rows || [])[0];
      if (!member)
        return { success: false, error: "Member not found" };
      if (member.STATUS !== "active")
        return { success: false, error: `Member account is ${member.STATUS}` };
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      if (member.MEMBERSHIP_EXPIRY) {
        const exp = member.MEMBERSHIP_EXPIRY instanceof Date ? member.MEMBERSHIP_EXPIRY.toISOString().split("T")[0] : String(member.MEMBERSHIP_EXPIRY).split("T")[0];
        if (exp < today)
          return { success: false, error: "Member's membership has expired" };
      }
      const cntRows = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM issue_transactions WHERE member_id=:1 AND status IN ('active','overdue')`,
        [data.member_id],
        { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT }
      );
      const activeCount = (cntRows.rows || [])[0].CNT;
      const maxBooks = member.MAX_BOOKS || 3;
      if (activeCount >= maxBooks)
        return { success: false, error: `Member has reached the maximum borrowing limit of ${maxBooks} books` };
      const copyRows = await conn.execute(
        `SELECT bc.*, b.title, b.author FROM book_copies bc JOIN books b ON bc.book_id = b.id WHERE bc.id = :1`,
        [data.book_copy_id],
        { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT }
      );
      const copy = (copyRows.rows || [])[0];
      if (!copy)
        return { success: false, error: "Book copy not found" };
      if (!copy.IS_AVAILABLE)
        return { success: false, error: "This book copy is not available" };
      const fineRows = await conn.execute(
        `SELECT NVL(SUM(amount), 0) AS TOTAL FROM fine_records WHERE member_id=:1 AND status='pending'`,
        [data.member_id],
        { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT }
      );
      const pendingFines = (fineRows.rows || [])[0].TOTAL || 0;
      const loanDays = member.LOAN_DAYS || 14;
      const dueDate = /* @__PURE__ */ new Date();
      dueDate.setDate(dueDate.getDate() + loanDays);
      const dueDateStr = dueDate.toISOString().split("T")[0];
      await conn.execute(`
        INSERT INTO issue_transactions (member_id, book_copy_id, book_id, issued_by, issue_date, due_date, status)
        VALUES (:1, :2, :3, :4, TRUNC(SYSDATE), TO_DATE(:5,'YYYY-MM-DD'), 'active')
      `, [data.member_id, data.book_copy_id, copy.BOOK_ID, data.issued_by, dueDateStr]);
      const issueRows = await conn.execute(
        `SELECT id FROM issue_transactions WHERE member_id=:1 AND book_copy_id=:2 AND status='active' ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
        [data.member_id, data.book_copy_id],
        { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT }
      );
      const issueId = (issueRows.rows || [])[0]?.ID;
      await conn.execute(`UPDATE book_copies SET is_available = 0 WHERE id = :1`, [data.book_copy_id]);
      await conn.execute(`UPDATE books SET available_copies = available_copies - 1 WHERE id = :1`, [copy.BOOK_ID]);
      if (issueId) {
        await conn.execute(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (:1, 'ISSUE_BOOK', 'issue_transaction', :2, :3)
        `, [data.issued_by, issueId, JSON.stringify({ member_id: data.member_id, book_copy_id: data.book_copy_id })]);
      }
      await conn.commit();
      return { success: true, id: issueId, dueDate: dueDateStr, bookTitle: copy.TITLE, pendingFines };
    } catch (err) {
      await conn.rollback();
      return { success: false, error: err.message };
    } finally {
      await conn.close();
    }
  });
  ipcMain2.handle("circulation:return", async (_e, data) => {
    const conn = await getConnection();
    try {
      const issueRows = await conn.execute(`
        SELECT it.*, bc.book_id, bc.accession_number, b.title
        FROM issue_transactions it
        JOIN book_copies bc ON it.book_copy_id = bc.id
        JOIN books b ON it.book_id = b.id
        WHERE it.id = :1 AND it.status IN ('active','overdue')
      `, [data.issue_id], { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT });
      const issue = (issueRows.rows || [])[0];
      if (!issue)
        return { success: false, error: "Loan record not found or already returned" };
      const today = /* @__PURE__ */ new Date();
      const dueDate = issue.DUE_DATE instanceof Date ? issue.DUE_DATE : new Date(issue.DUE_DATE);
      const overdueDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 864e5));
      const settRows = await conn.execute(
        `SELECT value FROM library_settings WHERE key_name = 'fine_per_day'`,
        [],
        { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT }
      );
      const finePerDay = parseFloat((settRows.rows || [])[0]?.VALUE || "2.00");
      const fineAmount = overdueDays * finePerDay;
      await conn.execute(`UPDATE issue_transactions SET status='returned' WHERE id=:1`, [issue.ID]);
      await conn.execute(`UPDATE book_copies SET is_available=1 WHERE id=:1`, [issue.BOOK_COPY_ID]);
      await conn.execute(`UPDATE books SET available_copies=available_copies+1 WHERE id=:1`, [issue.BOOK_ID]);
      await conn.execute(`
        INSERT INTO return_transactions (issue_id, member_id, book_copy_id, book_id, returned_by, return_date, overdue_days, condition, notes)
        VALUES (:1, :2, :3, :4, :5, TRUNC(SYSDATE), :6, :7, :8)
      `, [issue.ID, issue.MEMBER_ID, issue.BOOK_COPY_ID, issue.BOOK_ID, data.returned_by, overdueDays, data.condition || "Good", data.notes || null]);
      let fineId = null;
      if (fineAmount > 0) {
        const exFine = await conn.execute(
          `SELECT id FROM fine_records WHERE issue_id=:1`,
          [issue.ID],
          { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT }
        );
        const existing = (exFine.rows || [])[0];
        if (!existing) {
          await conn.execute(
            `INSERT INTO fine_records (issue_id, member_id, amount, overdue_days) VALUES (:1, :2, :3, :4)`,
            [issue.ID, issue.MEMBER_ID, fineAmount, overdueDays]
          );
          const fr = await conn.execute(
            `SELECT id FROM fine_records WHERE issue_id=:1 ORDER BY id DESC FETCH FIRST 1 ROWS ONLY`,
            [issue.ID],
            { outFormat: import_oracledb6.default.OUT_FORMAT_OBJECT }
          );
          fineId = (fr.rows || [])[0]?.ID;
        } else {
          await conn.execute(
            `UPDATE fine_records SET amount=:1, overdue_days=:2, updated_at=SYSTIMESTAMP WHERE id=:3`,
            [fineAmount, overdueDays, existing.ID]
          );
          fineId = existing.ID;
        }
      }
      await conn.commit();
      return { success: true, overdueDays, fineAmount, fineId, bookTitle: issue.TITLE };
    } catch (err) {
      await conn.rollback();
      return { success: false, error: err.message };
    } finally {
      await conn.close();
    }
  });
  ipcMain2.handle("circulation:getActiveLoans", async (_e, params = {}) => {
    let where = `WHERE it.status IN ('active','overdue')`;
    const binds = [];
    let bi = 1;
    if (params.search) {
      const s = `%${params.search}%`;
      where += ` AND (UPPER(m.full_name) LIKE UPPER(:${bi}) OR m.member_id LIKE :${bi + 1} OR UPPER(b.title) LIKE UPPER(:${bi + 2}) OR bc.accession_number LIKE :${bi + 3})`;
      binds.push(s, s, s, s);
      bi += 4;
    }
    if (params.overdue_only)
      where += ` AND TRUNC(SYSDATE) > it.due_date`;
    const countRows = await q4(
      `SELECT COUNT(*) AS CNT FROM issue_transactions it
       JOIN members m ON it.member_id=m.id
       JOIN books b ON it.book_id=b.id
       JOIN book_copies bc ON it.book_copy_id=bc.id ${where}`,
      binds
    );
    const total = countRows[0].CNT;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const rows = await q4(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, m.department,
             b.title, b.author, bc.accession_number,
             GREATEST(0, TRUNC(SYSDATE) - it.due_date) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      ${where}
      ORDER BY it.due_date ASC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit]);
    return { loans: rows.map(n2), total, page, limit };
  });
  ipcMain2.handle("circulation:getLoanById", async (_e, id) => {
    const rows = await q4(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, m.department,
             b.title, b.author, bc.accession_number,
             GREATEST(0, TRUNC(SYSDATE) - it.due_date) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.id = :1
    `, [id]);
    return rows.length ? n2(rows[0]) : null;
  });
  ipcMain2.handle("circulation:searchLoans", async (_e, search) => {
    const s = `%${search}%`;
    const rows = await q4(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code,
             b.title, b.author, bc.accession_number,
             GREATEST(0, TRUNC(SYSDATE) - it.due_date) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      WHERE it.status IN ('active','overdue')
        AND (UPPER(m.full_name) LIKE UPPER(:1) OR m.member_id LIKE :2 OR UPPER(b.title) LIKE UPPER(:3) OR bc.accession_number LIKE :4)
      ORDER BY it.due_date ASC
      FETCH FIRST 20 ROWS ONLY
    `, [s, s, s, s]);
    return rows.map(n2);
  });
  ipcMain2.handle("circulation:renew", async (_e, id) => {
    const rows = await q4(`SELECT * FROM issue_transactions WHERE id=:1 AND status='active'`, [id]);
    const loan = rows[0];
    if (!loan)
      return { success: false, error: "Active loan not found" };
    const settings = await q4(`SELECT key_name, value FROM library_settings WHERE key_name IN ('renewal_limit','renewal_days')`);
    const sMap = {};
    for (const s of settings)
      sMap[s.KEY_NAME] = s.VALUE;
    const renewalLimit = parseInt(sMap["renewal_limit"] || "2");
    const renewalDays = parseInt(sMap["renewal_days"] || "7");
    if (loan.RENEWAL_COUNT >= renewalLimit)
      return { success: false, error: `Renewal limit of ${renewalLimit} reached` };
    const dueDate = loan.DUE_DATE instanceof Date ? loan.DUE_DATE : new Date(loan.DUE_DATE);
    dueDate.setDate(dueDate.getDate() + renewalDays);
    const newDue = dueDate.toISOString().split("T")[0];
    const conn = await getConnection();
    try {
      await conn.execute(
        `UPDATE issue_transactions SET due_date=TO_DATE(:1,'YYYY-MM-DD'), renewal_count=renewal_count+1 WHERE id=:2`,
        [newDue, id],
        { autoCommit: true }
      );
    } finally {
      await conn.close();
    }
    return { success: true, newDueDate: newDue };
  });
}

// electron/ipc/oracle-fines.ts
var import_oracledb7 = __toESM(require("oracledb"));
async function q5(sql, binds = []) {
  const conn = await getConnection();
  try {
    const r = await conn.execute(sql, binds, { outFormat: import_oracledb7.default.OUT_FORMAT_OBJECT });
    return r.rows || [];
  } finally {
    await conn.close();
  }
}
async function x4(sql, binds = []) {
  const conn = await getConnection();
  try {
    return await conn.execute(sql, binds, { autoCommit: true });
  } finally {
    await conn.close();
  }
}
function n3(row) {
  if (!row)
    return row;
  const out = {};
  for (const k of Object.keys(row))
    out[k.toLowerCase()] = row[k];
  return out;
}
function registerFineHandlers2(ipcMain2) {
  ipcMain2.handle("fines:getAll", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bi = 1;
    if (params.status) {
      where += ` AND fr.status = :${bi}`;
      binds.push(params.status);
      bi++;
    }
    if (params.member_id) {
      where += ` AND fr.member_id = :${bi}`;
      binds.push(params.member_id);
      bi++;
    }
    if (params.search) {
      const s = `%${params.search}%`;
      where += ` AND (UPPER(m.full_name) LIKE UPPER(:${bi}) OR m.member_id LIKE :${bi + 1} OR UPPER(b.title) LIKE UPPER(:${bi + 2}))`;
      binds.push(s, s, s);
      bi += 3;
    }
    const base = `
      FROM fine_records fr
      JOIN members m ON fr.member_id = m.id
      JOIN issue_transactions it ON fr.issue_id = it.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      JOIN books b ON it.book_id = b.id
      LEFT JOIN users u ON fr.waived_by = u.id
      ${where}
    `;
    const countRows = await q5(`SELECT COUNT(*) AS CNT ${base}`, binds);
    const total = countRows[0].CNT;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const rows = await q5(`
      SELECT fr.*, m.full_name AS member_name, m.member_id AS member_code,
             b.title AS book_title, bc.accession_number,
             TO_CHAR(it.issue_date,'YYYY-MM-DD') AS issue_date,
             TO_CHAR(it.due_date,'YYYY-MM-DD') AS due_date,
             u.full_name AS waived_by_name
      ${base}
      ORDER BY fr.created_at DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, [...binds, offset, limit]);
    return { fines: rows.map(n3), total, page, limit };
  });
  ipcMain2.handle("fines:pay", async (_e, data) => {
    const rows = await q5(`SELECT * FROM fine_records WHERE id=:1`, [data.fine_id]);
    const fine = rows[0];
    if (!fine)
      return { success: false, error: "Fine record not found" };
    if (fine.STATUS !== "pending")
      return { success: false, error: "Fine is already paid or waived" };
    await x4(
      `INSERT INTO fine_payments (fine_id, amount, payment_method, received_by, notes) VALUES (:1, :2, :3, :4, :5)`,
      [data.fine_id, fine.AMOUNT, data.payment_method || "cash", data.received_by, data.notes || null]
    );
    await x4(`UPDATE fine_records SET status='paid', updated_at=SYSTIMESTAMP WHERE id=:1`, [data.fine_id]);
    return { success: true };
  });
  ipcMain2.handle("fines:waive", async (_e, data) => {
    const rows = await q5(`SELECT id FROM fine_records WHERE id=:1`, [data.fine_id]);
    if (!rows.length)
      return { success: false, error: "Fine record not found" };
    await x4(
      `UPDATE fine_records SET status='waived', waived_reason=:1, waived_by=:2, updated_at=SYSTIMESTAMP WHERE id=:3`,
      [data.reason, data.waived_by, data.fine_id]
    );
    return { success: true };
  });
  ipcMain2.handle("fines:getPolicy", async () => {
    const rows = await q5(`SELECT key_name AS key, value FROM library_settings WHERE key_name IN ('fine_per_day','max_loan_days')`);
    return rows.map(n3);
  });
}

// electron/ipc/oracle-reports.ts
var import_oracledb8 = __toESM(require("oracledb"));
async function q6(sql, binds = []) {
  const conn = await getConnection();
  try {
    const r = await conn.execute(sql, binds, { outFormat: import_oracledb8.default.OUT_FORMAT_OBJECT });
    return r.rows || [];
  } finally {
    await conn.close();
  }
}
function n4(row) {
  if (!row)
    return row;
  const out = {};
  for (const k of Object.keys(row)) {
    let val = row[k];
    if (val instanceof Date) {
      val = val.toISOString().split("T")[0];
    }
    out[k.toLowerCase()] = val;
  }
  return out;
}
function registerReportHandlers2(ipcMain2) {
  ipcMain2.handle("reports:dashboardStats", async () => {
    const b = await q6(`SELECT COUNT(*) AS CNT FROM books`);
    const c = await q6(`SELECT COUNT(*) AS CNT FROM book_copies`);
    const a = await q6(`SELECT COUNT(*) AS CNT FROM book_copies WHERE is_available = 1`);
    const i = await q6(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE status IN ('active','overdue')`);
    const o = await q6(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE status = 'overdue' OR (status = 'active' AND due_date < TRUNC(SYSDATE))`);
    const m = await q6(`SELECT COUNT(*) AS CNT FROM members WHERE status = 'active'`);
    const t = await q6(`SELECT COUNT(*) AS CNT FROM issue_transactions WHERE issue_date = TRUNC(SYSDATE)`);
    const pf = await q6(`SELECT COUNT(*) AS CNT FROM fine_records WHERE status = 'pending'`);
    const tfa = await q6(`SELECT NVL(SUM(amount), 0) AS TOTAL FROM fine_records WHERE status = 'pending'`);
    return {
      totalBooks: b[0]?.CNT || 0,
      totalCopies: c[0]?.CNT || 0,
      availableCopies: a[0]?.CNT || 0,
      issuedCopies: i[0]?.CNT || 0,
      overdueCount: o[0]?.CNT || 0,
      totalMembers: m[0]?.CNT || 0,
      issuedToday: t[0]?.CNT || 0,
      pendingFines: pf[0]?.CNT || 0,
      totalFineAmount: tfa[0]?.TOTAL || 0
    };
  });
  ipcMain2.handle("reports:recentTransactions", async () => {
    const rows = await q6(`
      SELECT it.id, 'issue' AS type, m.full_name AS member_name, m.member_id AS member_code,
             b.title AS book_title, TO_CHAR(it.issue_date, 'YYYY-MM-DD') AS "DATE",
             TO_CHAR(it.due_date, 'YYYY-MM-DD') AS due_date
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      ORDER BY it.created_at DESC
      FETCH FIRST 10 ROWS ONLY
    `);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:overdueBooks", async () => {
    const rows = await q6(`
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
    `);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:upcomingDues", async () => {
    const rows = await q6(`
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
    `);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:mostBorrowed", async () => {
    const rows = await q6(`
      SELECT b.id, b.title, b.author, c.name AS category_name,
             COUNT(it.id) AS borrow_count
      FROM issue_transactions it
      JOIN books b ON it.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      GROUP BY b.id, b.title, b.author, c.name
      ORDER BY borrow_count DESC
      FETCH FIRST 10 ROWS ONLY
    `);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:monthlyStats", async () => {
    const rows = await q6(`
      SELECT TO_CHAR(issue_date, 'YYYY-MM') AS month,
             COUNT(*) AS issued,
             SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned
      FROM issue_transactions
      WHERE issue_date >= ADD_MONTHS(TRUNC(SYSDATE), -12)
      GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
      ORDER BY month ASC
    `);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:inventory", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bi = 1;
    if (params.search) {
      const s = `%${params.search}%`;
      where += ` AND (UPPER(b.title) LIKE UPPER(:${bi}) OR UPPER(b.author) LIKE UPPER(:${bi + 1}) OR b.isbn LIKE :${bi + 2})`;
      binds.push(s, s, s);
      bi += 3;
    }
    if (params.category_id) {
      where += ` AND b.category_id = :${bi}`;
      binds.push(params.category_id);
      bi++;
    }
    const rows = await q6(`
      SELECT b.*, c.name AS category_name,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id) AS copy_count,
        (SELECT COUNT(*) FROM book_copies bc WHERE bc.book_id = b.id AND bc.is_available = 1) AS avail_count
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ${where}
      ORDER BY b.title
    `, binds);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:issued", async (_e, params = {}) => {
    let where = `WHERE it.status IN ('active','overdue')`;
    const binds = [];
    let bi = 1;
    if (params.from_date) {
      where += ` AND it.issue_date >= TO_DATE(:${bi}, 'YYYY-MM-DD')`;
      binds.push(params.from_date);
      bi++;
    }
    if (params.to_date) {
      where += ` AND it.issue_date <= TO_DATE(:${bi}, 'YYYY-MM-DD')`;
      binds.push(params.to_date);
      bi++;
    }
    const rows = await q6(`
      SELECT it.*, m.full_name AS member_name, m.member_id AS member_code, m.department,
             b.title, b.author, bc.accession_number,
             GREATEST(0, ROUND(TRUNC(SYSDATE) - it.due_date)) AS overdue_days
      FROM issue_transactions it
      JOIN members m ON it.member_id = m.id
      JOIN books b ON it.book_id = b.id
      JOIN book_copies bc ON it.book_copy_id = bc.id
      ${where}
      ORDER BY it.issue_date DESC
    `, binds);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:returns", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bi = 1;
    if (params.from_date) {
      where += ` AND rt.return_date >= TO_DATE(:${bi}, 'YYYY-MM-DD')`;
      binds.push(params.from_date);
      bi++;
    }
    if (params.to_date) {
      where += ` AND rt.return_date <= TO_DATE(:${bi}, 'YYYY-MM-DD')`;
      binds.push(params.to_date);
      bi++;
    }
    const rows = await q6(`
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
    `, binds);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:fines", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bi = 1;
    if (params.status) {
      where += ` AND fr.status = :${bi}`;
      binds.push(params.status);
      bi++;
    }
    if (params.from_date) {
      where += ` AND fr.created_at >= TO_TIMESTAMP(:${bi}, 'YYYY-MM-DD')`;
      binds.push(params.from_date);
      bi++;
    }
    if (params.to_date) {
      where += ` AND fr.created_at <= TO_TIMESTAMP(:${bi} || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`;
      binds.push(params.to_date);
      bi++;
    }
    const rows = await q6(`
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
    `, binds);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:members", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bi = 1;
    if (params.status) {
      where += ` AND m.status = :${bi}`;
      binds.push(params.status);
      bi++;
    }
    const rows = await q6(`
      SELECT m.*, mt.name AS membership_type_name,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id) AS total_borrows,
        (SELECT COUNT(*) FROM issue_transactions it WHERE it.member_id = m.id AND it.status IN ('active','overdue')) AS active_loans,
        (SELECT NVL(SUM(fr.amount),0) FROM fine_records fr WHERE fr.member_id = m.id AND fr.status = 'pending') AS pending_fines
      FROM members m
      LEFT JOIN membership_types mt ON m.membership_type_id = mt.id
      ${where}
      ORDER BY m.full_name
    `, binds);
    return rows.map(n4);
  });
  ipcMain2.handle("reports:export", async (_e, data) => {
    const rows = data.rows;
    if (!rows || rows.length === 0)
      return { success: false, error: "No data to export" };
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))
    ].join("\n");
    return { success: true, csv };
  });
}

// electron/ipc/oracle-settings.ts
var import_oracledb9 = __toESM(require("oracledb"));
var import_electron4 = require("electron");
var import_path4 = __toESM(require("path"));
var import_fs3 = __toESM(require("fs"));
async function q7(sql, binds = []) {
  const conn = await getConnection();
  try {
    const r = await conn.execute(sql, binds, { outFormat: import_oracledb9.default.OUT_FORMAT_OBJECT });
    return r.rows || [];
  } finally {
    await conn.close();
  }
}
function n5(row) {
  if (!row)
    return row;
  const out = {};
  for (const k of Object.keys(row)) {
    let val = row[k];
    if (val instanceof Date) {
      val = val.toISOString();
    }
    out[k.toLowerCase()] = val;
  }
  return out;
}
function registerSettingsHandlers2(ipcMain2) {
  ipcMain2.handle("settings:getAll", async () => {
    const rows = await q7(`SELECT id, key_name AS "key", value, description FROM library_settings ORDER BY key_name`);
    return rows.map((r) => ({
      id: r.ID,
      key: r.key || r.KEY,
      value: r.VALUE,
      description: r.DESCRIPTION
    }));
  });
  ipcMain2.handle("settings:update", async (_e, settings) => {
    const conn = await getConnection();
    try {
      for (const item of settings) {
        await conn.execute(`
          MERGE INTO library_settings ls
          USING (SELECT :key AS key_name, :val AS value FROM dual) src
          ON (ls.key_name = src.key_name)
          WHEN MATCHED THEN
            UPDATE SET ls.value = src.value, ls.updated_at = SYSTIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (key_name, value) VALUES (src.key_name, src.value)
        `, { key: item.key, val: String(item.value) });
      }
      await conn.commit();
      return { success: true };
    } catch (err) {
      await conn.rollback();
      return { success: false, error: err.message };
    } finally {
      await conn.close();
    }
  });
  ipcMain2.handle("settings:backup", async () => {
    try {
      const userDataPath = import_electron4.app.getPath("userData");
      const backupPath = import_path4.default.join(userDataPath, `library_oracle_backup_${Date.now()}.json`);
      const tables = [
        "ROLES",
        "USERS",
        "CATEGORIES",
        "BOOKS",
        "BOOK_COPIES",
        "MEMBERSHIP_TYPES",
        "MEMBERS",
        "ISSUE_TRANSACTIONS",
        "RETURN_TRANSACTIONS",
        "FINE_RECORDS",
        "FINE_PAYMENTS",
        "LIBRARY_SETTINGS"
      ];
      const dump = {};
      for (const tbl of tables) {
        dump[tbl] = await q7(`SELECT * FROM ${tbl}`);
      }
      import_fs3.default.writeFileSync(backupPath, JSON.stringify(dump, null, 2), "utf-8");
      return { success: true, path: backupPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain2.handle("settings:resetSampleData", async () => {
    const conn = await getConnection();
    try {
      const tables = [
        "fine_payments",
        "fine_records",
        "return_transactions",
        "issue_transactions",
        "book_copies",
        "books",
        "members",
        "categories",
        "membership_types",
        "audit_logs",
        "library_settings",
        "users",
        "roles"
      ];
      for (const t of tables) {
        await conn.execute(`DELETE FROM ${t}`);
      }
      await conn.commit();
      await seedDatabase2();
      return { success: true };
    } catch (e) {
      await conn.rollback();
      return { success: false, error: e.message };
    } finally {
      await conn.close();
    }
  });
  ipcMain2.handle("settings:auditLogs", async (_e, params = {}) => {
    let where = `WHERE 1=1`;
    const binds = [];
    let bi = 1;
    if (params.user_id) {
      where += ` AND al.user_id = :${bi}`;
      binds.push(params.user_id);
      bi++;
    }
    if (params.action) {
      where += ` AND UPPER(al.action) LIKE UPPER(:${bi})`;
      binds.push(`%${params.action}%`);
      bi++;
    }
    if (params.from_date) {
      where += ` AND al.created_at >= TO_TIMESTAMP(:${bi}, 'YYYY-MM-DD')`;
      binds.push(params.from_date);
      bi++;
    }
    const rows = await q7(`
      SELECT al.*, u.full_name AS full_name, u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      FETCH FIRST 100 ROWS ONLY
    `, binds);
    return rows.map(n5);
  });
}

// electron/main.ts
var mainWindow = null;
var activeDbType = "sqlite";
var dbConnectionStatus = "connected";
var dbErrorMessage = "";
function writeLog(msg) {
  try {
    const logPath = import_path5.default.join(import_electron5.app.getPath("userData"), "startup.log");
    import_fs4.default.appendFileSync(logPath, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
  } catch (e) {
  }
}
function registerDbManagementHandlers() {
  import_electron5.ipcMain.handle("db:getInfo", async () => {
    const config = loadDbConfig();
    return {
      activeDbType,
      status: dbConnectionStatus,
      error: dbErrorMessage,
      config: {
        dbType: config.dbType,
        oracle: {
          user: config.oracle.user,
          connectString: config.oracle.connectString,
          poolMin: config.oracle.poolMin,
          poolMax: config.oracle.poolMax
        }
      }
    };
  });
  import_electron5.ipcMain.handle("db:saveConfig", async (_e, newConfig) => {
    try {
      saveDbConfig(newConfig);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  import_electron5.ipcMain.handle("db:testOracle", async (_e, oracleConfig) => {
    try {
      import_oracledb10.default.outFormat = import_oracledb10.default.OUT_FORMAT_OBJECT;
      const conn = await import_oracledb10.default.getConnection({
        user: oracleConfig.user,
        password: oracleConfig.password,
        connectString: oracleConfig.connectString
      });
      const result = await conn.execute(`SELECT 'Oracle Database connected successfully!' AS MESSAGE FROM dual`);
      await conn.close();
      const msg = result.rows?.[0]?.MESSAGE || "Connected";
      return { success: true, message: msg };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
function createWindow() {
  mainWindow = new import_electron5.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#f5f4f1",
    titleBarStyle: "default",
    title: "Library Management System",
    webPreferences: {
      preload: import_path5.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });
  if (false) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(import_path5.default.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
    writeLog("Window shown");
  });
  mainWindow.on("closed", () => {
    writeLog("Window closed");
    mainWindow = null;
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    writeLog(`Failed to load: ${errorDescription} (${errorCode})`);
  });
}
import_electron5.app.whenReady().then(async () => {
  writeLog("App ready, checking database configuration...");
  registerDbManagementHandlers();
  const config = loadDbConfig();
  let initialized = false;
  if (config.dbType === "oracle" || process.env.DB_TYPE === "oracle") {
    try {
      writeLog("Attempting to connect to Oracle Database...");
      await initDatabase2();
      writeLog("Oracle Database connected and tables created.");
      await seedDatabase2();
      writeLog("Oracle Database seeded.");
      registerAuthHandlers2(import_electron5.ipcMain);
      registerBookHandlers2(import_electron5.ipcMain);
      registerMemberHandlers2(import_electron5.ipcMain);
      registerCirculationHandlers2(import_electron5.ipcMain);
      registerFineHandlers2(import_electron5.ipcMain);
      registerReportHandlers2(import_electron5.ipcMain);
      registerSettingsHandlers2(import_electron5.ipcMain);
      activeDbType = "oracle";
      dbConnectionStatus = "connected";
      initialized = true;
      writeLog("Oracle IPC handlers registered successfully.");
    } catch (oracleErr) {
      writeLog(`Oracle connection failed: ${oracleErr.message}. Falling back to SQLite...`);
      dbConnectionStatus = "error";
      dbErrorMessage = oracleErr.message;
    }
  }
  if (!initialized) {
    try {
      writeLog("Initializing SQLite Database...");
      const sqliteDb = initDatabase();
      writeLog("SQLite Database initialized");
      seedDatabase(sqliteDb);
      writeLog("SQLite Database seeded");
      registerAuthHandlers(import_electron5.ipcMain, sqliteDb);
      registerBookHandlers(import_electron5.ipcMain, sqliteDb);
      registerMemberHandlers(import_electron5.ipcMain, sqliteDb);
      registerCirculationHandlers(import_electron5.ipcMain, sqliteDb);
      registerFineHandlers(import_electron5.ipcMain, sqliteDb);
      registerReportHandlers(import_electron5.ipcMain, sqliteDb);
      registerSettingsHandlers(import_electron5.ipcMain, sqliteDb);
      activeDbType = "sqlite";
      initialized = true;
      writeLog("SQLite IPC handlers registered.");
    } catch (sqliteErr) {
      writeLog(`FATAL ERROR initializing SQLite: ${sqliteErr.message}
${sqliteErr.stack}`);
      import_electron5.app.quit();
      return;
    }
  }
  createWindow();
  writeLog("Main window created");
  import_electron5.app.on("activate", () => {
    if (import_electron5.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
import_electron5.app.on("window-all-closed", () => {
  writeLog("All windows closed");
  if (process.platform !== "darwin")
    import_electron5.app.quit();
});
