"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDb = getDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
let db;
function initDatabase() {
    const userDataPath = electron_1.app.getPath('userData');
    const dbPath = path_1.default.join(userDataPath, 'library.db');
    db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    createTables(db);
    return db;
}
function createTables(db) {
    db.exec(`
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
function getDb() {
    return db;
}
