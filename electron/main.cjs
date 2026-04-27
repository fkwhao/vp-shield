const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow = null
let backendProcess = null

// Backend JAR path - 将 JAR 包放在 resources 目录下
// 开发模式: electron/resources/vp-shield.jar
// 生产模式: app/resources/vp-shield.jar
const isDev = process.env.ELECTRON_DEV === 'true' || !app.isPackaged
const BACKEND_JAR_NAME = 'vp-shield.jar'

function getBackendJarPath() {
  if (isDev) {
    return path.join(__dirname, 'resources', BACKEND_JAR_NAME)
  }
  return path.join(process.resourcesPath, 'resources', BACKEND_JAR_NAME)
}

const JAVA_PATH = findJava17()

function findJava17() {
  const { execSync } = require('child_process')

  // 尝试常见的 Java 17 路径
  const possiblePaths = []

  if (process.platform === 'win32') {
    // Windows: 检查常见安装位置
    possiblePaths.push(
      'java', // 先尝试系统 PATH
      'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.2\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.3\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.4\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.5\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.6\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.7\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.8\\bin\\java.exe',
      'C:\\Program Files\\Java\\jdk-17.0.9\\bin\\java.exe',
      'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.7-hotspot\\bin\\java.exe',
      'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.8-hotspot\\bin\\java.exe',
      'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.9-hotspot\\bin\\java.exe',
      'C:\\Program Files\\Microsoft\\jdk-17\\bin\\java.exe',
    )
  } else if (process.platform === 'darwin') {
    // macOS
    possiblePaths.push(
      'java',
      '/usr/local/opt/openjdk@17/bin/java',
      '/opt/homebrew/opt/openjdk@17/bin/java',
      '/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java',
    )
  } else {
    // Linux
    possiblePaths.push(
      'java',
      '/usr/lib/jvm/java-17-openjdk/bin/java',
      '/usr/lib/jvm/java-17-openjdk-amd64/bin/java',
      '/usr/lib/jvm/jdk-17/bin/java',
    )
  }

  for (const javaPath of possiblePaths) {
    try {
      const output = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8', timeout: 5000 })
      if (output.includes('version "17') || output.includes('version "17.') || output.includes('version 17')) {
        console.log(`Found Java 17 at: ${javaPath}`)
        return javaPath
      }
    } catch (e) {
      // 忽略错误，继续尝试下一个路径
    }
  }

  // 如果没找到 Java 17，返回默认 'java'，让用户知道需要安装
  console.warn('Java 17 not found, using default java. Backend may fail if Java < 17.')
  return 'java'
}

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

    const jarPath = getBackendJarPath()

    // Check if JAR exists
    if (!fs.existsSync(jarPath)) {
      resolve({ success: false, message: `JAR not found: ${jarPath}` })
      return
    }

    // Check Java version before starting
    const { execSync } = require('child_process')
    try {
      const versionOutput = execSync(`"${JAVA_PATH}" -version 2>&1`, { encoding: 'utf8', timeout: 5000 })
      console.log(`Java version check: ${versionOutput.split('\n')[0]}`)

      // Check if Java 17+
      if (!versionOutput.includes('version "17') && !versionOutput.includes('version "18') && !versionOutput.includes('version "19') && !versionOutput.includes('version "20') && !versionOutput.includes('version "21')) {
        const errorMsg = '需要 Java 17 或更高版本。当前 Java 版本过低，请安装 JDK 17+。'
        console.error(errorMsg)
        resolve({ success: false, message: errorMsg })
        return
      }
    } catch (e) {
      console.warn('Could not verify Java version:', e.message)
    }

    try {
      backendProcess = spawn(JAVA_PATH, ['-jar', jarPath], {
        cwd: path.dirname(jarPath),
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