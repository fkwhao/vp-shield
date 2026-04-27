const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow = null
let backendProcess = null

// Backend JAR path - adjust this to your actual JAR location
const BACKEND_JAR_PATH = path.join(__dirname, '../../VP-Shield_Backend/vp-shield_backend/target/vp-shield-backend.jar')
const JAVA_PATH = 'java' // or full path to java executable

// Check if running in development mode
const isDev = process.env.ELECTRON_DEV === 'true' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0e17',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? true : false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
  })

  // Development mode - load from Vite dev server
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Start backend Java process
function startBackend() {
  return new Promise((resolve, reject) => {
    if (backendProcess) {
      resolve({ success: true, message: 'Backend already running' })
      return
    }

    // Check if JAR exists
    if (!fs.existsSync(BACKEND_JAR_PATH)) {
      resolve({ success: false, message: 'Backend JAR not found. Please build the backend first.' })
      return
    }

    try {
      backendProcess = spawn(JAVA_PATH, ['-jar', BACKEND_JAR_PATH], {
        cwd: path.dirname(BACKEND_JAR_PATH),
        stdio: ['ignore', 'pipe', 'pipe']
      })

      backendProcess.stdout.on('data', (data) => {
        console.log(`[Backend] ${data.toString()}`)
        if (mainWindow) {
          mainWindow.webContents.send('backend-log', {
            type: 'stdout',
            data: data.toString()
          })
        }
      })

      backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString()}`)
        if (mainWindow) {
          mainWindow.webContents.send('backend-log', {
            type: 'stderr',
            data: data.toString()
          })
        }
      })

      backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`)
        backendProcess = null
        if (mainWindow) {
          mainWindow.webContents.send('backend-status', { running: false })
        }
      })

      backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err)
        backendProcess = null
        reject({ success: false, message: err.message })
      })

      // Give the backend some time to start
      setTimeout(() => {
        if (backendProcess) {
          resolve({ success: true, message: 'Backend started successfully' })
        } else {
          resolve({ success: false, message: 'Backend failed to start' })
        }
      }, 2000)

    } catch (error) {
      reject({ success: false, message: error.message })
    }
  })
}

// Stop backend Java process
function stopBackend() {
  return new Promise((resolve) => {
    if (!backendProcess) {
      resolve({ success: true, message: 'Backend not running' })
      return
    }

    backendProcess.kill('SIGTERM')
    backendProcess = null
    resolve({ success: true, message: 'Backend stopped' })
  })
}

// IPC Handlers
ipcMain.handle('start-backend', async () => {
  return await startBackend()
})

ipcMain.handle('stop-backend', async () => {
  return await stopBackend()
})

ipcMain.handle('get-backend-status', () => {
  return { running: backendProcess !== null }
})

// Window controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', async () => {
  await stopBackend()
  mainWindow?.close()
})

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await stopBackend()
})