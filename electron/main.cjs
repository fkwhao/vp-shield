const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const fs = require('fs')

let mainWindow = null
let backendProcess = null

// Backend JAR path - 将 JAR 包放在 resources 目录下
// 开发模式: electron/resources/vp-shield.jar
// 生产模式: app/resources/vp-shield.jar
const isDev = process.env.ELECTRON_DEV === 'true' || !app.isPackaged
const BACKEND_JAR_NAME = 'vp-shield.jar'

// 检测 Npcap 是否已安装
function checkNpcapInstalled() {
  if (process.platform !== 'win32') return true

  // 检查 Npcap 或 WinPcap 是否安装
  const npcapPath = 'C:\\Windows\\System32\\Npcap'
  const winpcapPath = 'C:\\Windows\\System32\\wpcap.dll'

  return fs.existsSync(npcapPath) || fs.existsSync(winpcapPath)
}

function getBackendJarPath() {
  if (isDev) {
    return path.join(__dirname, 'resources', BACKEND_JAR_NAME)
  }
  return path.join(process.resourcesPath, 'resources', BACKEND_JAR_NAME)
}

function getJrePath() {
  // 内置 JRE 路径
  if (isDev) {
    return path.join(__dirname, 'resources', 'jre')
  }
  return path.join(process.resourcesPath, 'resources', 'jre')
}

function getJavaExecutable() {
  const jrePath = getJrePath()

  // 优先使用内置 JRE
  if (fs.existsSync(jrePath)) {
    if (process.platform === 'win32') {
      const javaExe = path.join(jrePath, 'bin', 'java.exe')
      if (fs.existsSync(javaExe)) {
        console.log(`Using bundled JRE: ${javaExe}`)
        return javaExe
      }
    } else {
      const javaExe = path.join(jrePath, 'bin', 'java')
      if (fs.existsSync(javaExe)) {
        console.log(`Using bundled JRE: ${javaExe}`)
        return javaExe
      }
    }
  }

  // 回退到系统 Java
  return findSystemJava17()
}

function findSystemJava17() {
  // 尝试常见的 Java 17 路径
  const possiblePaths = []

  if (process.platform === 'win32') {
    possiblePaths.push(
      'java',
      'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
      'C:\\Program Files\\Eclipse Adoptium\\jdk-17-hotspot\\bin\\java.exe',
      'C:\\Program Files\\Microsoft\\jdk-17\\bin\\java.exe',
    )
  } else if (process.platform === 'darwin') {
    possiblePaths.push(
      'java',
      '/usr/local/opt/openjdk@17/bin/java',
      '/opt/homebrew/opt/openjdk@17/bin/java',
    )
  } else {
    possiblePaths.push(
      'java',
      '/usr/lib/jvm/java-17-openjdk/bin/java',
    )
  }

  for (const javaPath of possiblePaths) {
    try {
      const output = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8', timeout: 5000 })
      if (output.includes('version "17') || output.includes('version "1') && parseInt(output.match(/version "(\d+)/)?.[1]) >= 17) {
        console.log(`Found system Java 17 at: ${javaPath}`)
        return javaPath
      }
    } catch (e) {
      // 继续尝试下一个路径
    }
  }

  console.warn('Java 17 not found, using default java.')
  return 'java'
}

const JAVA_PATH = getJavaExecutable()

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

    // 检查 Npcap 是否安装
    if (!checkNpcapInstalled()) {
      const result = dialog.showMessageBoxSync(mainWindow, {
        type: 'error',
        title: '缺少 Npcap',
        message: '未检测到 Npcap，网络抓包功能无法使用。',
        detail: '请下载并安装 Npcap 后重试。\n\n下载地址: https://npcap.com',
        buttons: ['下载 Npcap', '取消'],
        defaultId: 0,
        cancelId: 1
      })

      if (result === 0) {
        shell.openExternal('https://npcap.com/#download')
      }

      resolve({
        success: false,
        message: 'Npcap not installed. Please install from https://npcap.com'
      })
      return
    }

    const jarPath = getBackendJarPath()

    // Check if JAR exists
    if (!fs.existsSync(jarPath)) {
      resolve({ success: false, message: `JAR not found: ${jarPath}` })
      return
    }

    // Check if Java exists
    if (!fs.existsSync(JAVA_PATH) && JAVA_PATH === 'java') {
      const jrePath = getJrePath()
      resolve({
        success: false,
        message: `未找到 Java 运行环境。请运行以下命令下载 JRE:\nnpm run download-jre`
      })
      return
    }

    try {
      // 添加 UTF-8 编码参数，解决 Windows 中文乱码问题
      backendProcess = spawn(JAVA_PATH, [
        '-Dfile.encoding=UTF-8',
        '-Dconsole.encoding=UTF-8',
        '-jar', jarPath
      ], {
        cwd: path.dirname(jarPath),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, JAVA_TOOL_OPTIONS: '-Dfile.encoding=UTF-8' }
      })

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString('utf8')
        // 只在开发模式下输出到控制台
        if (isDev) {
          console.log(`[Backend] ${output}`)
        }
        if (mainWindow) {
          mainWindow.webContents.send('backend-log', {
            type: 'stdout',
            data: output
          })
        }
      })

      backendProcess.stderr.on('data', (data) => {
        const output = data.toString('utf8')
        // 只在开发模式下输出到控制台
        if (isDev) {
          console.error(`[Backend Error] ${output}`)
        }
        if (mainWindow) {
          mainWindow.webContents.send('backend-log', {
            type: 'stderr',
            data: output
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

ipcMain.handle('check-npcap', () => {
  return { installed: checkNpcapInstalled() }
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