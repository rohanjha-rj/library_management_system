import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDatabase } from './database/init'
import { seedDatabase } from './database/seed'
import { registerAuthHandlers } from './ipc/auth'
import { registerBookHandlers } from './ipc/books'
import { registerMemberHandlers } from './ipc/members'
import { registerCirculationHandlers } from './ipc/circulation'
import { registerFineHandlers } from './ipc/fines'
import { registerReportHandlers } from './ipc/reports'
import { registerSettingsHandlers } from './ipc/settings'

let mainWindow: BrowserWindow | null = null

function writeLog(msg: string) {
  try {
    const logPath = path.join(app.getPath('userData'), 'startup.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)
  } catch (e) {
    // ignore
  }
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

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    writeLog(`Failed to load: ${errorDescription} (${errorCode})`)
  })
}

app.whenReady().then(() => {
  writeLog('App ready, initializing database...')
  try {
    const db = initDatabase()
    writeLog('Database initialized')
    seedDatabase(db)
    writeLog('Database seeded')

    registerAuthHandlers(ipcMain, db)
    registerBookHandlers(ipcMain, db)
    registerMemberHandlers(ipcMain, db)
    registerCirculationHandlers(ipcMain, db)
    registerFineHandlers(ipcMain, db)
    registerReportHandlers(ipcMain, db)
    registerSettingsHandlers(ipcMain, db)
    writeLog('IPC handlers registered')

    createWindow()
    writeLog('Window created')
  } catch (err: any) {
    writeLog(`ERROR: ${err.message}\n${err.stack}`)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  writeLog('All windows closed')
  if (process.platform !== 'darwin') app.quit()
})
