import oracledb from 'oracledb'
import { loadDbConfig } from './db-config'

export async function initDatabase(): Promise<void> {
  const config = loadDbConfig()

  // Thin Mode: pure JS, no Oracle Instant Client required
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
  oracledb.autoCommit = false

  await oracledb.createPool({
    user: config.oracle.user,
    password: config.oracle.password,
    connectString: config.oracle.connectString,
    poolMin: config.oracle.poolMin || 2,
    poolMax: config.oracle.poolMax || 10,
    poolIncrement: 1,
  })

  await createTables()
}

export async function getConnection(): Promise<oracledb.Connection> {
  return oracledb.getConnection()
}

async function execDDL(sql: string): Promise<void> {
  const conn = await getConnection()
  try {
    await conn.execute(sql)
    await conn.commit()
  } catch (err: any) {
    // ORA-00955: name already used by existing object
    // ORA-01408: such column list already indexed
    if (err.errorNum !== 955 && err.errorNum !== 942 && err.errorNum !== 1408) {
      console.warn('Oracle DDL warning:', err.message)
    }
  } finally {
    await conn.close()
  }
}

async function createTables(): Promise<void> {
  // Roles
  await execDDL(`
    CREATE TABLE roles (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        VARCHAR2(50)  NOT NULL UNIQUE,
      description VARCHAR2(255),
      permissions CLOB          NOT NULL
    )
  `)

  // Users
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
  `)

  // Categories
  await execDDL(`
    CREATE TABLE categories (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        VARCHAR2(100) NOT NULL UNIQUE,
      description VARCHAR2(500),
      created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `)

  // Books
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
  `)

  // Book Copies
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
  `)

  // Membership Types
  await execDDL(`
    CREATE TABLE membership_types (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        VARCHAR2(50) NOT NULL UNIQUE,
      max_books   NUMBER       DEFAULT 3 NOT NULL,
      loan_days   NUMBER       DEFAULT 14 NOT NULL,
      description VARCHAR2(300)
    )
  `)

  // Members
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
  `)

  // Issue Transactions
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
  `)

  // Return Transactions
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
  `)

  // Fine Records
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
  `)

  // Fine Payments
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
  `)

  // Library Settings
  await execDDL(`
    CREATE TABLE library_settings (
      id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      key_name    VARCHAR2(100) NOT NULL UNIQUE,
      value       VARCHAR2(500) NOT NULL,
      description VARCHAR2(300),
      updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
    )
  `)

  // Audit Logs
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
  `)

  // Indexes
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
    `CREATE INDEX idx_audit_user   ON audit_logs(user_id)`,
  ]
  for (const sql of indexes) {
    await execDDL(sql)
  }
}
