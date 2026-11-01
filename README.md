# Library Management System

A fully functional, professional **Desktop Library Management System** built with **Electron + React + TypeScript + Oracle Database (with SQLite fallback)**.

Designed for college and institutional libraries. Supports **Oracle Database 19c, 21c XE, and 23ai Free** via official `oracledb` Thin Mode.

See [ORACLE_SETUP_GUIDE.md](file:///c:/Users/jharo/Desktop/Web%20Designing/library_management_system/ORACLE_SETUP_GUIDE.md) for complete Oracle Database installation and connection instructions.

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Administrator | `admin` | `admin123` |
| Librarian | `librarian` | `lib123` |
| Assistant Librarian | `assistant` | `assist123` |

---

## Features

- **Dashboard** — Live statistics, overdue alerts, recent transactions, monthly circulation chart
- **Book Management** — Full CRUD, search/filter, copy tracking, circulation history
- **Member Management** — Registration, membership types, borrowing history, profiles
- **Book Issue** — Smart workflow with member/book search, availability check, limit enforcement
- **Book Return** — Search by member/accession/title, automatic fine calculation
- **Fine Management** — Collect payments, waive with reason, payment history
- **Reports** — Inventory, issued books, returns, fines, members — CSV export
- **Settings** — Library info, fine policy, user management, database backup

---

## Quick Start

### Requirements
- Node.js 18+ (for build tools)
- Windows 10/11

### Install Dependencies
```bash
npm install
```

> **Note**: This runs `electron-rebuild` automatically to compile `better-sqlite3` for your Electron version.

### Development Mode
```bash
npm run dev
```
This starts the Vite dev server (port 5173) and Electron simultaneously.

### Production Mode
```bash
npm run build
npm start
```

### Web Browser Mode (No Electron needed)
```bash
npm run dev:react
```
Then open `http://localhost:5173` in your browser.

> **Note**: In browser mode, IPC calls to the Electron backend won't work. This is useful for UI development only.

---

## Project Structure

```
library_management_system/
├── electron/               # Main process (Node.js/Electron)
│   ├── main.ts            # App entry point
│   ├── preload.ts         # Context bridge / IPC bridge
│   ├── database/
│   │   ├── init.ts        # Database schema creation
│   │   └── seed.ts        # Sample data seeding
│   └── ipc/               # IPC handlers (one per module)
│       ├── auth.ts
│       ├── books.ts
│       ├── members.ts
│       ├── circulation.ts
│       ├── fines.ts
│       ├── reports.ts
│       └── settings.ts
├── src/                   # Renderer process (React/TypeScript)
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts
│   ├── context/
│   │   └── AppContext.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── BooksPage.tsx
│   │   ├── MembersPage.tsx
│   │   ├── IssueBookPage.tsx
│   │   ├── ReturnBookPage.tsx
│   │   ├── ActiveLoansPage.tsx
│   │   ├── FinesPage.tsx
│   │   ├── ReportsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/        # Reusable UI components
│   └── styles/
│       └── global.css     # Complete design system
├── build-electron.js      # esbuild bundler for main process
├── vite.config.ts         # Vite config for renderer
├── tsconfig.json          # TypeScript config (renderer)
└── tsconfig.electron.json # TypeScript config (main)
```

---

## Database

SQLite database stored at: `%APPDATA%\library-management-system\library.db`

### Tables
- `users`, `roles` — Authentication & authorization
- `books`, `book_copies`, `categories` — Book inventory
- `members`, `membership_types` — Member management
- `issue_transactions`, `return_transactions` — Circulation
- `fine_records`, `fine_payments` — Fine management
- `library_settings` — Application configuration
- `audit_logs` — Admin action tracking

### Sample Data
- 30 books across 15 categories with multiple copies
- 15 members (students, faculty, research scholars, staff)
- Active loans, overdue books, and fine records

---

## Build for Windows

```bash
npm run dist
```
Output: `release/` directory with NSIS installer.

---

## Troubleshooting

### "Cannot find module 'electron'"
This is an environment-specific issue with Electron's C++ initialization. Try:
```bash
npm install electron@29 --save-dev
```

### "better-sqlite3 version mismatch"
Run:
```bash
npx electron-rebuild -f -w better-sqlite3
```

### Application doesn't open
Try launching with:
```bash
.\node_modules\electron\dist\electron.exe . --no-sandbox --disable-gpu
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron 29 |
| UI Library | React 18 + TypeScript |
| Build Tool | Vite 5 + esbuild |
| Database | SQLite (better-sqlite3) |
| Charting | Recharts |
| Icons | Lucide React |
| Password Hashing | bcryptjs |
