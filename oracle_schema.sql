-- =====================================================================
-- Library Management System — Oracle Database DDL Schema Script
-- Compatible with Oracle Database 12c, 19c, 21c, 23ai (Express Edition XE)
-- =====================================================================

-- Drop existing tables (if re-creating)
BEGIN
  FOR t IN (SELECT table_name FROM user_tables WHERE table_name IN (
    'FINE_PAYMENTS', 'FINE_RECORDS', 'RETURN_TRANSACTIONS', 'ISSUE_TRANSACTIONS',
    'BOOK_COPIES', 'BOOKS', 'MEMBERS', 'MEMBERSHIP_TYPES', 'CATEGORIES',
    'LIBRARY_SETTINGS', 'AUDIT_LOGS', 'USERS', 'ROLES'
  )) LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
  END LOOP;
END;
/

-- 1. Roles
CREATE TABLE roles (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR2(50)  NOT NULL UNIQUE,
  description VARCHAR2(255),
  permissions CLOB          NOT NULL
);

-- 2. Users
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
);

-- 3. Categories
CREATE TABLE categories (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR2(100) NOT NULL UNIQUE,
  description VARCHAR2(500),
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- 4. Books
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
);

-- 5. Book Copies
CREATE TABLE book_copies (
  id               NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id          NUMBER        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  accession_number VARCHAR2(20)  NOT NULL UNIQUE,
  condition        VARCHAR2(20)  DEFAULT 'Good',
  is_available     NUMBER(1)     DEFAULT 1 NOT NULL,
  notes            VARCHAR2(500),
  created_at       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- 6. Membership Types
CREATE TABLE membership_types (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR2(50) NOT NULL UNIQUE,
  max_books   NUMBER       DEFAULT 3 NOT NULL,
  loan_days   NUMBER       DEFAULT 14 NOT NULL,
  description VARCHAR2(300)
);

-- 7. Members
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
);

-- 8. Issue Transactions
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
);

-- 9. Return Transactions
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
);

-- 10. Fine Records
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
);

-- 11. Fine Payments
CREATE TABLE fine_payments (
  id             NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fine_id        NUMBER       NOT NULL REFERENCES fine_records(id),
  amount         NUMBER(10,2) NOT NULL,
  payment_method VARCHAR2(30) DEFAULT 'cash',
  received_by    NUMBER       NOT NULL REFERENCES users(id),
  payment_date   TIMESTAMP    DEFAULT SYSTIMESTAMP NOT NULL,
  notes          VARCHAR2(500)
);

-- 12. Library Settings
CREATE TABLE library_settings (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_name    VARCHAR2(100) NOT NULL UNIQUE,
  value       VARCHAR2(500) NOT NULL,
  description VARCHAR2(300),
  updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- 13. Audit Logs
CREATE TABLE audit_logs (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     NUMBER REFERENCES users(id),
  action      VARCHAR2(100) NOT NULL,
  entity_type VARCHAR2(50),
  entity_id   NUMBER,
  details     CLOB,
  ip_address  VARCHAR2(50),
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Performance Indexes
CREATE INDEX idx_books_isbn   ON books(isbn);
CREATE INDEX idx_books_title  ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_copies_acc   ON book_copies(accession_number);
CREATE INDEX idx_members_mid  ON members(member_id);
CREATE INDEX idx_issue_member ON issue_transactions(member_id);
CREATE INDEX idx_issue_status ON issue_transactions(status);
CREATE INDEX idx_fine_member  ON fine_records(member_id);
CREATE INDEX idx_fine_status  ON fine_records(status);
CREATE INDEX idx_audit_user   ON audit_logs(user_id);

COMMIT;

