import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useShieldStore = defineStore('shield', () => {
  const isConnected = ref(false)
  const backendProcessRunning = ref(false)
  const isUnderAttack = ref(false)

  const trafficData = ref([])
  const maxDataPoints = 60

  const stats = ref({
    currentPps: 0,
    avgPps: 0,
    peakPps: 0,
    blockedCount: 0
  })

  const logs = ref([])
  const maxLogs = 500

  const alertVisible = ref(false)
  const alertData = ref({
    title: '',
    message: '',
    alertType: 'danger',
    details: null
  })

  let ws = null
  let wsReconnectTimer = null
  let wsUrl = ''
  let reconnectEnabled = true
  let healthCheckInterval = null
  let lastBackendStatus = false

  const backendHealth = computed(() => {
    if (isConnected.value) return 'online'
    if (backendProcessRunning.value) return 'warning'
    return 'offline'
  })

  const connectionStatus = computed(() => (
    isConnected.value ? 'connected' : 'disconnected'
  ))

  const addTrafficData = (data = {}) => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const normal = data.totalPackets ?? data.normal ?? data.packetsPerSecond ?? 0
    const abnormal = (
      (data.tcpSynCount ?? 0) +
      (data.icmpReplyCount ?? 0) +
      (data.abnormal ?? 0) +
      (data.suspiciousPackets ?? 0)
    )

    trafficData.value.push({ time: timeStr, normal, abnormal })

    if (trafficData.value.length > maxDataPoints) {
      trafficData.value.shift()
    }

    stats.value.currentPps = normal + abnormal
    const totalPps = trafficData.value.reduce((sum, item) => sum + item.normal + item.abnormal, 0)
    stats.value.avgPps = trafficData.value.length ? Math.round(totalPps / trafficData.value.length) : 0
    stats.value.peakPps = Math.max(stats.value.peakPps, stats.value.currentPps)

    if (data.attackDetected || abnormal > normal * 0.35) {
      isUnderAttack.value = true
    } else if (abnormal === 0) {
      isUnderAttack.value = false
    }
  }

  const addLog = (log) => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })

    logs.value.unshift({
      timestamp,
      level: log.level || 'info',
      source: log.source,
      message: log.message
    })

    if (logs.value.length > maxLogs) {
      logs.value.pop()
    }
  }

  const showAlert = (data) => {
    alertData.value = data
    alertVisible.value = true

    addLog({
      level: data.alertType === 'danger' ? 'danger' : 'warning',
      source: 'ALERT',
      message: data.message
    })
  }

  const hideAlert = () => {
    alertVisible.value = false
  }

  const clearLogs = () => {
    logs.value = []
  }

  const setBackendProcessStatus = (running) => {
    backendProcessRunning.value = Boolean(running)
  }

  const scheduleReconnect = () => {
    if (!reconnectEnabled || !wsUrl || wsReconnectTimer) return

    wsReconnectTimer = setTimeout(() => {
      wsReconnectTimer = null
      connectWebSocket(wsUrl, { manual: false, silent: false })
    }, 3000)
  }

  const checkBackendHealth = async () => {
    // 如果已经连接，不需要再检查
    if (isConnected.value) {
      lastBackendStatus = true
      backendProcessRunning.value = true
      return true
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/status', {
        method: 'GET'
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // 状态从 offline 变为 online
          if (!lastBackendStatus) {
            addLog({
              level: 'success',
              source: 'HEALTH',
              message: '检测到后端服务在线'
            })
          }
          lastBackendStatus = true
          backendProcessRunning.value = true
          // 只有在 WebSocket 未连接时才尝试连接
          if (!isConnected.value && reconnectEnabled && !ws) {
            const targetUrl = wsUrl || 'ws://localhost:8080/ws/traffic'
            if (!wsUrl) wsUrl = targetUrl
            connectWebSocket(targetUrl, { manual: false, silent: true })
          }
          return true
        }
      }
    } catch (e) {
      // 状态从 online 变为 offline
      if (lastBackendStatus) {
        addLog({
          level: 'warning',
          source: 'HEALTH',
          message: '后端服务已离线'
        })
      }
      lastBackendStatus = false
      backendProcessRunning.value = false
    }
    return false
  }

  const startHealthCheck = () => {
    if (healthCheckInterval) return
    // 立即执行一次检查
    checkBackendHealth()
    // 每 3 秒检查一次
    healthCheckInterval = setInterval(checkBackendHealth, 3000)
  }

  const stopHealthCheck = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
  }

  const connectWebSocket = (url = 'ws://localhost:8080/ws/traffic', options = {}) => {
    const { manual = true, silent = false } = options
    wsUrl = url
    reconnectEnabled = true

    if (ws) {
      ws.close()
      ws = null
    }

    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer)
      wsReconnectTimer = null
    }

    if (!silent) {
      addLog({
        level: 'info',
        source: 'WS',
        message: `正在连接 ${url}...`
      })
    }

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        isConnected.value = true
        backendProcessRunning.value = true
        addLog({
          level: 'success',
          source: 'WS',
          message: 'WebSocket 连接成功'
        })
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch {
          addLog({
            level: 'info',
            source: 'BACKEND',
            message: event.data
          })
        }
      }

      ws.onclose = (event) => {
        const wasConnected = isConnected.value
        isConnected.value = false

        if (!manual && backendProcessRunning.value) {
          addLog({
            level: 'warning',
            source: 'WS',
            message: `WebSocket 已断开 (code: ${event.code})，后端可能仍在运行，3 秒后重连`
          })
        } else if (reconnectEnabled && wasConnected) {
          addLog({
            level: 'warning',
            source: 'WS',
            message: 'WebSocket 已断开，3 秒后重连'
          })
        }

        scheduleReconnect()
      }

      ws.onerror = (err) => {
        isConnected.value = false
        if (!silent) {
          addLog({
            level: 'danger',
            source: 'WS',
            message: 'WebSocket 连接失败，请确认后端服务已启动 (ws://localhost:8080)'
          })
        }
      }
    } catch (error) {
      addLog({
        level: 'danger',
        source: 'WS',
        message: `连接失败: ${error.message}`
      })
    }
  }

  const sendWebSocketMessage = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
      return true
    }

    addLog({
      level: 'warning',
      source: 'WS',
      message: 'WebSocket 未连接，无法发送消息'
    })
    return false
  }

  const handleWebSocketMessage = (data = {}) => {
    const payload = data.data || data.payload || data

    switch (data.type) {
      case 'stats':
      case 'traffic':
        addTrafficData(payload)
        break
      case 'alert':
        isUnderAttack.value = true
        showAlert({
          title: '检测到攻击告警',
          message: payload.message || payload.description || '检测到异常流量',
          alertType: 'danger',
          details: {
            威胁类型: payload.alertType || payload.threatType || '未知',
            来源IP: payload.sourceIp || payload.sourceIps?.join(', ') || '未知',
            攻击源数量: payload.sourceIps?.length || 1,
            严重程度: payload.severity || '高'
          }
        })
        break
      default:
        if (!data.type) {
          addTrafficData(payload)
        }
    }
  }

  const disconnectWebSocket = ({ manual = true } = {}) => {
    reconnectEnabled = !manual

    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer)
      wsReconnectTimer = null
    }

    if (manual) {
      wsUrl = ''
      reconnectEnabled = false
    }

    if (ws) {
      ws.close()
      ws = null
    }

    isConnected.value = false
  }

  const startBackend = async () => {
    if (!window.electronAPI) {
      return { success: false, message: 'Electron API not available' }
    }

    const result = await window.electronAPI.startBackend()
    if (result.success) {
      backendProcessRunning.value = true
      addLog({
        level: 'success',
        source: 'SYSTEM',
        message: '后端服务启动成功'
      })
    } else {
      addLog({
        level: 'danger',
        source: 'SYSTEM',
        message: `后端启动失败: ${result.message}`
      })
    }
    return result
  }

  const stopBackend = async () => {
    if (!window.electronAPI) {
      return { success: false, message: 'Electron API not available' }
    }

    const result = await window.electronAPI.stopBackend()
    backendProcessRunning.value = false
    disconnectWebSocket({ manual: true })
    addLog({
      level: 'info',
      source: 'SYSTEM',
      message: '后端服务已停止'
    })
    return result
  }

  return {
    isConnected,
    backendProcessRunning,
    backendHealth,
    isUnderAttack,
    trafficData,
    stats,
    logs,
    alertVisible,
    alertData,
    connectionStatus,
    addTrafficData,
    addLog,
    showAlert,
    hideAlert,
    clearLogs,
    setBackendProcessStatus,
    connectWebSocket,
    disconnectWebSocket,
    sendWebSocketMessage,
    startBackend,
    stopBackend,
    checkBackendHealth,
    startHealthCheck,
    stopHealthCheck
  }
})
