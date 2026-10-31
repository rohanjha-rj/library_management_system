"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsHandlers = registerSettingsHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const seed_1 = require("../database/seed");
function registerSettingsHandlers(ipcMain, db) {
    ipcMain.handle('settings:getAll', async () => {
        return db.prepare('SELECT * FROM library_settings ORDER BY key').all();
    });
    ipcMain.handle('settings:update', async (_event, settings) => {
        const stmt = db.prepare("INSERT INTO library_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')");
        const updateMany = db.transaction((items) => {
            for (const item of items)
                stmt.run(item.key, item.value);
        });
        updateMany(settings);
        return { success: true };
    });
    ipcMain.handle('settings:backup', async () => {
        try {
            const userDataPath = electron_1.app.getPath('userData');
            const dbPath = path_1.default.join(userDataPath, 'library.db');
            const backupPath = path_1.default.join(userDataPath, `library_backup_${Date.now()}.db`);
            fs_1.default.copyFileSync(dbPath, backupPath);
            return { success: true, path: backupPath };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    ipcMain.handle('settings:resetSampleData', async () => {
        try {
            // Clear only sample data, keep users and settings
            db.prepare('DELETE FROM fine_payments').run();
            db.prepare('DELETE FROM fine_records').run();
            db.prepare('DELETE FROM return_transactions').run();
            db.prepare('DELETE FROM issue_transactions').run();
            db.prepare('DELETE FROM book_copies').run();
            db.prepare('DELETE FROM books').run();
            db.prepare('DELETE FROM members').run();
            db.prepare('DELETE FROM categories').run();
            db.prepare('DELETE FROM membership_types').run();
            // Reset auto-increment
            db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?,?,?,?,?,?,?,?,?)').run('books', 'book_copies', 'members', 'issue_transactions', 'return_transactions', 'fine_records', 'fine_payments', 'categories', 'membership_types');
            // Re-seed
            const userCount = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
            // Temporarily clear users count trick to allow seed
            const tempFlag = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
            // Just run seed directly since it checks users
            // We need to temporarily make it think it's a fresh seed
            db.prepare('DELETE FROM users').run();
            db.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
            db.prepare('DELETE FROM roles').run();
            db.prepare("DELETE FROM sqlite_sequence WHERE name = 'roles'").run();
            (0, seed_1.seedDatabase)(db);
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    });
    ipcMain.handle('settings:auditLogs', async (_event, params = {}) => {
        let query = `
      SELECT al.*, u.full_name as user_name, u.username
      FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
        const args = [];
        if (params.user_id) {
            query += ` AND al.user_id = ?`;
            args.push(params.user_id);
        }
        if (params.action) {
            query += ` AND al.action LIKE ?`;
            args.push(`%${params.action}%`);
        }
        if (params.from_date) {
            query += ` AND al.created_at >= ?`;
            args.push(params.from_date);
        }
        query += ` ORDER BY al.created_at DESC LIMIT 100`;
        return db.prepare(query).all(...args);
    });
}
