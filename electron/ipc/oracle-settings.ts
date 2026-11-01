import { IpcMain } from 'electron'
import oracledb from 'oracledb'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { getConnection } from '../database/oracle-init'
import { seedDatabase } from '../database/oracle-seed'

async function q<T = any>(sql: string, binds: any[] | object = []): Promise<T[]> {
  const conn = await getConnection()
  try {
    const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    return (r.rows || []) as T[]
  } finally {
    await conn.close()
  }
}

async function x(sql: string, binds: any[] | object = []): Promise<oracledb.Result<any>> {
  const conn = await getConnection()
  try {
    return await conn.execute(sql, binds, { autoCommit: true })
  } finally {
    await conn.close()
  }
}

function n(row: any): any {
  if (!row) return row
  const out: any = {}
  for (const k of Object.keys(row)) {
    let val = row[k]
    if (val instanceof Date) {
      val = val.toISOString()
    }
    out[k.toLowerCase()] = val
  }
  return out
}

export function registerSettingsHandlers(ipcMain: IpcMain) {
  ipcMain.handle('settings:getAll', async () => {
    const rows = await q(`SELECT id, key_name AS "key", value, description FROM library_settings ORDER BY key_name`)
    return rows.map(r => ({
      id: r.ID,
      key: r.key || r.KEY,
      value: r.VALUE,
      description: r.DESCRIPTION
    }))
  })

  ipcMain.handle('settings:update', async (_e, settings: { key: string; value: string }[]) => {
    const conn = await getConnection()
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
        `, { key: item.key, val: String(item.value) })
      }
      await conn.commit()
      return { success: true }
    } catch (err: any) {
      await conn.rollback()
      return { success: false, error: err.message }
    } finally {
      await conn.close()
    }
  })

  ipcMain.handle('settings:backup', async () => {
    try {
      const userDataPath = app.getPath('userData')
      const backupPath = path.join(userDataPath, `library_oracle_backup_${Date.now()}.json`)

      const tables = [
        'ROLES', 'USERS', 'CATEGORIES', 'BOOKS', 'BOOK_COPIES',
        'MEMBERSHIP_TYPES', 'MEMBERS', 'ISSUE_TRANSACTIONS',
        'RETURN_TRANSACTIONS', 'FINE_RECORDS', 'FINE_PAYMENTS', 'LIBRARY_SETTINGS'
      ]

      const dump: Record<string, any[]> = {}
      for (const tbl of tables) {
        dump[tbl] = await q(`SELECT * FROM ${tbl}`)
      }

      fs.writeFileSync(backupPath, JSON.stringify(dump, null, 2), 'utf-8')
      return { success: true, path: backupPath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('settings:resetSampleData', async () => {
    const conn = await getConnection()
    try {
      const tables = [
        'fine_payments', 'fine_records', 'return_transactions',
        'issue_transactions', 'book_copies', 'books', 'members',
        'categories', 'membership_types', 'audit_logs', 'library_settings',
        'users', 'roles'
      ]
      for (const t of tables) {
        await conn.execute(`DELETE FROM ${t}`)
      }
      await conn.commit()
      await seedDatabase()
      return { success: true }
    } catch (e: any) {
      await conn.rollback()
      return { success: false, error: e.message }
    } finally {
      await conn.close()
    }
  })

  ipcMain.handle('settings:auditLogs', async (_e, params: any = {}) => {
    let where = `WHERE 1=1`
    const binds: any[] = []
    let bi = 1

    if (params.user_id) {
      where += ` AND al.user_id = :${bi}`
      binds.push(params.user_id); bi++
    }
    if (params.action) {
      where += ` AND UPPER(al.action) LIKE UPPER(:${bi})`
      binds.push(`%${params.action}%`); bi++
    }
    if (params.from_date) {
      where += ` AND al.created_at >= TO_TIMESTAMP(:${bi}, 'YYYY-MM-DD')`
      binds.push(params.from_date); bi++
    }

    const rows = await q(`
      SELECT al.*, u.full_name AS full_name, u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      FETCH FIRST 100 ROWS ONLY
    `, binds)
    return rows.map(n)
  })
}

