# Oracle Database Setup Guide for Library Management System

This guide walks you through setting up **Oracle Database (Express Edition - XE or Free)** on Windows and connecting your Library Management System desktop application.

---

## 1. Download & Install Oracle Database XE / Free

1. **Download Oracle Database 21c XE** (or Oracle Database 23ai Free):
   - Official Oracle Link: [Oracle Database Express Edition Downloads](https://www.oracle.com/database/technologies/xe-downloads.html)
   - Or Oracle 23ai Free: [Oracle Database Free Downloads](https://www.oracle.com/database/free/)
2. Run the Windows installer (`setup.exe`).
3. Set your administrative password for `SYS` and `SYSTEM` (e.g. `SysPassword123!`).
4. Complete the installation. Note down the default connection details:
   - **Host:** `localhost`
   - **Port:** `1521`
   - **Pluggable Database (PDB):** `XEPDB1` (or `FREEPDB1` on 23ai)

---

## 2. Create the Library Database User

Open **SQL*Plus** or **Command Prompt** / **PowerShell** and connect as `SYSDBA`:

```cmd
sqlplus sys/SysPassword123!@localhost:1521/XEPDB1 as sysdba
```
*(Replace `SysPassword123!` with your SYS password).*

Then execute these SQL commands to create the `LIBRARY` user:

```sql
-- Create the application user/schema
CREATE USER LIBRARY IDENTIFIED BY library123
  DEFAULT TABLESPACE users
  TEMPORARY TABLESPACE temp
  QUOTA UNLIMITED ON users;

-- Grant required permissions
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE TABLE, UNLIMITED TABLESPACE TO LIBRARY;

EXIT;
```

---

## 3. Connecting the Desktop Application to Oracle

You have two simple ways to switch the application to Oracle:

### Method A: Through the App UI (Settings Page)
1. Launch the application:
   ```cmd
   npm start
   ```
   *(Or `npm run dev` during development).*
2. Log in using the admin account (`admin` / `admin123`).
3. Go to **Settings & Administration** in the sidebar.
4. Click on the **Database** tab.
5. In the **Oracle Database Setup & Connection** section:
   - **Connection String:** `localhost:1521/XEPDB1`
   - **Username:** `LIBRARY`
   - **Password:** `library123`
6. Click **Test Oracle Connection** to verify connectivity.
7. Click **Switch to Oracle Database**!

### Method B: Via Environment Variable
You can also launch the app targeting Oracle directly:

```powershell
$env:DB_TYPE="oracle"
$env:ORACLE_CONNECT="localhost:1521/XEPDB1"
$env:ORACLE_USER="LIBRARY"
$env:ORACLE_PASSWORD="library123"
npm start
```

---

## 4. Automatic Table Creation and Seeding

When the application connects to Oracle for the first time:
- It automatically creates all 13 tables, primary key identities, foreign key constraints, and performance indexes via [oracle-init.ts](file:///c:/Users/jharo/Desktop/Web%20Designing/library_management_system/electron/database/oracle-init.ts).
- It seeds initial demonstration records (30 categorized books, 15 members, active loans, and overdue records) via [oracle-seed.ts](file:///c:/Users/jharo/Desktop/Web%20Designing/library_management_system/electron/database/oracle-seed.ts).

If you prefer to manually run the SQL schema, a complete standalone script is provided at [oracle_schema.sql](file:///c:/Users/jharo/Desktop/Web%20Designing/library_management_system/oracle_schema.sql).

---

## 5. Technical Architecture Highlights

- **Pure JavaScript Driver (node-oracledb Thin Mode):** No native C++ compilation or Oracle Instant Client required.
- **Fail-safe Dual-Engine Architecture:** If Oracle Database is temporarily offline or being configured, the application falls back safely to SQLite so you never lose access to your application.

