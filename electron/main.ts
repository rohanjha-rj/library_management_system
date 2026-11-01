import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import oracledb from 'oracledb'

// SQLite imports
import { initDatabase as initSqliteDb } from './database/init'
import { seedDatabase as seedSqliteDb } from './database/seed'
import { registerAuthHandlers as regSqliteAuth } from './ipc/auth'
import { registerBookHandlers as regSqliteBooks } from './ipc/books'
import { registerMemberHandlers as regSqliteMembers } from './ipc/members'
import { registerCirculationHandlers as regSqliteCirc } from './ipc/circulation'
import { registerFineHandlers as regSqliteFines } from './ipc/fines'
import { registerReportHandlers as regSqliteReports } from './ipc/reports'
import { registerSettingsHandlers as regSqliteSettings } from './ipc/settings'

// Oracle imports
import { loadDbConfig, saveDbConfig } from './database/db-config'
import { initDatabase as initOracleDb } from './database/oracle-init'
import { seedDatabase as seedOracleDb } from './database/oracle-seed'
import { registerAuthHandlers as regOracleAuth } from './ipc/oracle-auth'
import { registerBookHandlers as regOracleBooks } from './ipc/oracle-books'
import { registerMemberHandlers as regOracleMembers } from './ipc/oracle-members'
import { registerCirculationHandlers as regOracleCirc } from './ipc/oracle-circulation'
import { registerFineHandlers as regOracleFines } from './ipc/oracle-fines'
import { registerReportHandlers as regOracleReports } from './ipc/oracle-reports'
import { registerSettingsHandlers as regOracleSettings } from './ipc/oracle-settings'

let mainWindow: BrowserWindow | null = null
let activeDbType: 'oracle' | 'sqlite' = 'sqlite'
let dbConnectionStatus: 'connected' | 'error' = 'connected'
let dbErrorMessage: string = ''

function writeLog(msg: string) {
  try {
    const logPath = path.join(app.getPath('userData'), 'startup.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)
  } catch (e) {
    // ignore
  }
}

function registerDbManagementHandlers() {
  ipcMain.handle('db:getInfo', async () => {
    const config = loadDbConfig()
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
          poolMax: config.oracle.poolMax,
        }
      }
    }
  })

  ipcMain.handle('db:saveConfig', async (_e, newConfig) => {
    try {
      saveDbConfig(newConfig)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:testOracle', async (_e, oracleConfig) => {
    try {
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
      const conn = await oracledb.getConnection({
        user: oracleConfig.user,
        password: oracleConfig.password,
        connectString: oracleConfig.connectString,
      })
      const result = await conn.execute(`SELECT 'Oracle Database connected successfully!' AS MESSAGE FROM dual`)
      await conn.close()
      const msg = (result.rows?.[0] as any)?.MESSAGE || 'Connected'
      return { success: true, message: msg }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f5f4f1',
    titleBarStyle: 'default',
    title: 'Library Management System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
    writeLog('Window shown')
  })

  mainWindow.on('closed', () => {
    writeLog('Window closed')
    mainWindow = null
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    writeLog(`Failed to load: ${errorDescription} (${errorCode})`)
  })
}

app.whenReady().then(async () => {
  writeLog('App ready, checking database configuration...')
  registerDbManagementHandlers()

  const config = loadDbConfig()
  let initialized = false

  if (config.dbType === 'oracle' || process.env.DB_TYPE === 'oracle') {
    try {
      writeLog('Attempting to connect to Oracle Database...')
      await initOracleDb()
      writeLog('Oracle Database connected and tables created.')
      await seedOracleDb()
      writeLog('Oracle Database seeded.')

      regOracleAuth(ipcMain)
      regOracleBooks(ipcMain)
      regOracleMembers(ipcMain)
      regOracleCirc(ipcMain)
      regOracleFines(ipcMain)
      regOracleReports(ipcMain)
      regOracleSettings(ipcMain)

      activeDbType = 'oracle'
      dbConnectionStatus = 'connected'
      initialized = true
      writeLog('Oracle IPC handlers registered successfully.')
    } catch (oracleErr: any) {
      writeLog(`Oracle connection failed: ${oracleErr.message}. Falling back to SQLite...`)
      dbConnectionStatus = 'error'
      dbErrorMessage = oracleErr.message
    }
  }

  if (!initialized) {
    try {
      writeLog('Initializing SQLite Database...')
      const sqliteDb = initSqliteDb()
      writeLog('SQLite Database initialized')
      seedSqliteDb(sqliteDb)
      writeLog('SQLite Database seeded')

      regSqliteAuth(ipcMain, sqliteDb)
      regSqliteBooks(ipcMain, sqliteDb)
      regSqliteMembers(ipcMain, sqliteDb)
      regSqliteCirc(ipcMain, sqliteDb)
      regSqliteFines(ipcMain, sqliteDb)
      regSqliteReports(ipcMain, sqliteDb)
      regSqliteSettings(ipcMain, sqliteDb)

      activeDbType = 'sqlite'
      initialized = true
      writeLog('SQLite IPC handlers registered.')
    } catch (sqliteErr: any) {
      writeLog(`FATAL ERROR initializing SQLite: ${sqliteErr.message}\n${sqliteErr.stack}`)
      app.quit()
      return
    }
  }

  createWindow()
  writeLog('Main window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  writeLog('All windows closed')
  if (process.platform !== 'darwin') app.quit()
})
