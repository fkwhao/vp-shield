const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend control
  startBackend: () => ipcRenderer.invoke('start-backend'),
  stopBackend: () => ipcRenderer.invoke('stop-backend'),
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  checkNpcap: () => ipcRenderer.invoke('check-npcap'),

  // Backend event listeners
  onBackendLog: (callback) => {
    ipcRenderer.on('backend-log', (event, data) => callback(data))
  },
  onBackendStatus: (callback) => {
    ipcRenderer.on('backend-status', (event, data) => callback(data))
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Remove listeners (for cleanup)
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// WebSocket API for backend communication
contextBridge.exposeInMainWorld('wsAPI', {
  connect: (url) => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url)
        ws.onopen = () => resolve(ws)
        ws.onerror = (error) => reject(error)
      } catch (error) {
        reject(error)
      }
    })
  }
})
