"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthHandlers = registerAuthHandlers;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function registerAuthHandlers(ipcMain, db) {
    ipcMain.handle('auth:login', async (_event, { username, password }) => {
        const user = db.prepare(`
      SELECT u.*, r.name as role_name, r.permissions
      FROM users u JOIN roles r ON u.role_id = r.id
      WHERE u.username = ? AND u.is_active = 1
    `).get(username);
        if (!user)
            return { success: false, error: 'Invalid username or password' };
        const valid = bcryptjs_1.default.compareSync(password, user.password_hash);
        if (!valid)
            return { success: false, error: 'Invalid username or password' };
        db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
        db.prepare(`INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'LOGIN', ?)`).run(user.id, JSON.stringify({ username }));
        return {
            success: true,
            user: {
                id: user.id, username: user.username, fullName: user.full_name,
                email: user.email, role: user.role_name, permissions: JSON.parse(user.permissions)
            }
        };
    });
    ipcMain.handle('auth:logout', async (_event) => {
        return { success: true };
    });
    ipcMain.handle('auth:changePassword', async (_event, { userId, oldPassword, newPassword }) => {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user)
            return { success: false, error: 'User not found' };
        if (!bcryptjs_1.default.compareSync(oldPassword, user.password_hash)) {
            return { success: false, error: 'Current password is incorrect' };
        }
        const hash = bcryptjs_1.default.hashSync(newPassword, 10);
        db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, userId);
        return { success: true };
    });
    ipcMain.handle('auth:getUsers', async () => {
        return db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.is_active, u.last_login, u.created_at,
             r.name as role_name, r.id as role_id
      FROM users u JOIN roles r ON u.role_id = r.id
      ORDER BY u.full_name
    `).all();
    });
    ipcMain.handle('auth:createUser', async (_event, data) => {
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
        if (existing)
            return { success: false, error: 'Username already exists' };
        const hash = bcryptjs_1.default.hashSync(data.password, 10);
        const r = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, email, role_id) VALUES (?, ?, ?, ?, ?)
    `).run(data.username, hash, data.full_name, data.email || null, data.role_id);
        return { success: true, id: r.lastInsertRowid };
    });
    ipcMain.handle('auth:updateUser', async (_event, data) => {
        const updates = ['full_name = ?', 'email = ?', 'role_id = ?', 'is_active = ?', "updated_at = datetime('now')"];
        const values = [data.full_name, data.email, data.role_id, data.is_active, data.id];
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return { success: true };
    });
    ipcMain.handle('auth:deleteUser', async (_event, id) => {
        db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
        return { success: true };
    });
}
