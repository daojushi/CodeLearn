import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { initDatabase } from './db/connection'
import { runMigrations } from './db/migrations'
import { runSeed } from './db/seed'
import { initImagesDir } from './images'
import { registerIpc } from './ipc'
import { resolveDataDir } from './storage'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'CodeLearn',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // 开发模式加载 electron-vite dev server,生产模式加载打包产物
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 数据目录默认 %APPDATA%/CodeLearn,可在 Settings 中改存其它位置(storage.ts)
app.whenReady().then(() => {
  const dataDir = resolveDataDir()
  initDatabase(join(dataDir, 'codelearn.db'))
  runMigrations()
  runSeed()
  initImagesDir(join(dataDir, 'images'))
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 单实例:避免重复启动导致双窗口写同一数据库
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
