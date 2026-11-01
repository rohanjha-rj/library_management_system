import { IpcMain } from 'electron'
import oracledb from 'oracledb'
import bcrypt from 'bcryptjs'
import { getConnection } from '../database/oracle-init'

/** Run a SELECT and return rows as objects */
async function q<T = any>(sql: string, binds: any[] | object = []): Promise<T[]> {
  const conn = await getConnection()
  try {
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    return (result.rows || []) as T[]
  } finally {
    await conn.close()
  }
}

/** Run DML and auto-commit */
async function x(sql: string, binds: any[] | object = []): Promise<oracledb.Result<any>> {
  const conn = await getConnection()
  try {
    return await conn.execute(sql, binds, { autoCommit: true })
  } finally {
    await conn.close()
  }
}

export function registerAuthHandlers(ipcMain: IpcMain) {
  ipcMain.handle('auth:login', async (_e, { username, password }) => {
    const rows = await q(`
      SELECT u.*, r.name AS role_name, r.permissions
      FROM users u JOIN roles r ON u.role_id = r.id
      WHERE u.username = :1 AND u.is_active = 1
    `, [username])
    const user = rows[0] as any
    if (!user) return { success: false, error: 'Invalid username or password' }

    const valid = bcrypt.compareSync(password, user.PASSWORD_HASH)
    if (!valid) return { success: false, error: 'Invalid username or password' }

    await x(`UPDATE users SET last_login = SYSTIMESTAMP WHERE id = :1`, [user.ID])
    await x(`INSERT INTO audit_logs (user_id, action, details) VALUES (:1, 'LOGIN', :2)`,
      [user.ID, JSON.stringify({ username })])

    return {
      success: true,
      user: {
        id: user.ID, username: user.USERNAME, fullName: user.FULL_NAME,
        email: user.EMAIL, role: user.ROLE_NAME,
        permissions: JSON.parse(user.PERMISSIONS),
      },
    }
  })

  ipcMain.handle('auth:logout', async () => ({ success: true }))

  ipcMain.handle('auth:changePassword', async (_e, { userId, oldPassword, newPassword }) => {
    const rows = await q(`SELECT * FROM users WHERE id = :1`, [userId])
    const user = rows[0] as any
    if (!user) return { success: false, error: 'User not found' }
    if (!bcrypt.compareSync(oldPassword, user.PASSWORD_HASH))
      return { success: false, error: 'Current password is incorrect' }
    const hash = bcrypt.hashSync(newPassword, 10)
    await x(`UPDATE users SET password_hash = :1, updated_at = SYSTIMESTAMP WHERE id = :2`, [hash, userId])
    return { success: true }
  })

  ipcMain.handle('auth:getUsers', async () => {
    return q(`
      SELECT u.id, u.username, u.full_name, u.email, u.is_active,
             u.last_login, u.created_at, r.name AS role_name, r.id AS role_id
      FROM users u JOIN roles r ON u.role_id = r.id
      ORDER BY u.full_name
    `)
  })

  ipcMain.handle('auth:createUser', async (_e, data) => {
    const ex = await q(`SELECT id FROM users WHERE username = :1`, [data.username])
    if (ex.length) return { success: false, error: 'Username already exists' }
    const hash = bcrypt.hashSync(data.password, 10)
    await x(
      `INSERT INTO users (username, password_hash, full_name, email, role_id) VALUES (:1, :2, :3, :4, :5)`,
      [data.username, hash, data.full_name, data.email || null, data.role_id]
    )
    const rows = await q(`SELECT id FROM users WHERE username = :1`, [data.username])
    return { success: true, id: rows[0]?.ID }
  })

  ipcMain.handle('auth:updateUser', async (_e, data) => {
    await x(
      `UPDATE users SET full_name=:1, email=:2, role_id=:3, is_active=:4, updated_at=SYSTIMESTAMP WHERE id=:5`,
      [data.full_name, data.email || null, data.role_id, data.is_active, data.id]
    )
    return { success: true }
  })

  ipcMain.handle('auth:deleteUser', async (_e, id) => {
    await x(`UPDATE users SET is_active = 0 WHERE id = :1`, [id])
    return { success: true }
  })
}

