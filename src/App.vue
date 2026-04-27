<template>
  <div class="app-container">
    <div class="shell app-shell-card">
      <TitleBar
        :backend-status="store.backendHealth"
        :theme="theme"
        @toggle-theme="toggleTheme"
      />

      <div class="main-layout">
        <Sidebar
          :backend-status="sidebarStatus.backend"
          :ws-status="sidebarStatus.ws"
          :defense-status="sidebarStatus.defense"
          :stats="sidebarStats"
          @start-backend="handleStartBackend"
          @stop-backend="handleStopBackend"
          @export-logs="handleExportLogs"
          @open-settings="handleOpenSettings"
        />

        <div class="main-content">
          <div class="left-panel app-shell-card">
            <Dashboard
              :traffic-data="store.trafficData"
              :is-connected="store.isConnected"
              :stats="store.stats"
              :theme="theme"
            />
          </div>

          <div class="right-panel">
            <div class="right-top app-shell-card">
              <AttackControl @log="handleAttackLog" />
            </div>
            <div class="right-bottom app-shell-card">
              <SecurityLogs
                :logs="store.logs"
                :is-live="store.isConnected"
                @clear="store.clearLogs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <AlertModal
      :visible="store.alertVisible"
      :title="store.alertData.title"
      :message="store.alertData.message"
      :alert-type="store.alertData.alertType"
      :details="store.alertData.details"
      @close="store.hideAlert"
      @action="handleAlertAction"
    />

    <Transition name="attack-indicator">
      <div v-if="store.isUnderAttack" class="attack-indicator">
        <span class="dot"></span>
        <span>检测到异常流量</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useShieldStore } from './stores/shield'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import Dashboard from './components/Dashboard.vue'
import AttackControl from './components/AttackControl.vue'
import SecurityLogs from './components/SecurityLogs.vue'
import AlertModal from './components/AlertModal.vue'

const store = useShieldStore()

const uptime = ref(0)
const theme = ref(localStorage.getItem('vp-shield-theme') || 'light')
let uptimeInterval = null

const WS_URL = 'ws://localhost:8080/ws/traffic'

const sidebarStatus = computed(() => ({
  backend: store.backendHealth,
  ws: store.isConnected ? 'online' : 'offline',
  defense: store.isConnected ? 'online' : store.backendProcessRunning ? 'warning' : 'offline'
}))

const sidebarStats = computed(() => ({
  uptime: uptime.value,
  activeConnections: store.isConnected ? 1 : 0,
  threatLevel: store.isUnderAttack ? 'HIGH' : 'LOW',
  blockedToday: store.stats.blockedCount
}))

const applyTheme = (mode) => {
  document.documentElement.setAttribute('data-theme', mode)
  localStorage.setItem('vp-shield-theme', mode)
}

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(theme.value)
}

const handleAttackLog = (log) => {
  store.addLog(log)
}

const handleAlertAction = () => {
  store.hideAlert()
  store.addLog({
    level: 'info',
    source: 'DEFENSE',
    message: '正在处理安全威胁...'
  })
}

const handleStartBackend = async () => {
  if (window.electronAPI) {
    const result = await store.startBackend()
    if (result.success) {
      setTimeout(() => {
        store.connectWebSocket(WS_URL, { silent: true })
      }, 1200)
    }
    return
  }

  // 非 Electron 环境：直接连接后端
  store.addLog({
    level: 'info',
    source: 'SYSTEM',
    message: '正在连接后端服务...'
  })
  store.connectWebSocket(WS_URL)
  store.checkBackendHealth()
}

const handleStopBackend = async () => {
  if (window.electronAPI) {
    await store.stopBackend()
    return
  }

  store.disconnectWebSocket({ manual: true })
}

const handleExportLogs = () => {
  const logs = store.logs
    .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.source ? `[${log.source}] ` : ''}${log.message}`)
    .join('\n')

  const blob = new Blob([logs], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vp-shield-logs-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)

  store.addLog({
    level: 'info',
    source: 'SYSTEM',
    message: '日志已导出'
  })
}

const handleOpenSettings = () => {
  store.addLog({
    level: 'info',
    source: 'SYSTEM',
    message: '设置功能开发中...'
  })
}

onMounted(() => {
  applyTheme(theme.value)

  store.addLog({
    level: 'info',
    source: 'SYSTEM',
    message: 'VP-Shield 防护系统初始化完成'
  })

  uptimeInterval = setInterval(() => {
    uptime.value += 1
  }, 1000)

  if (window.electronAPI) {
    // Electron 环境：监听后端状态变化
    window.electronAPI.getBackendStatus().then((status) => {
      store.setBackendProcessStatus(status.running)
    })

    window.electronAPI.onBackendStatus((data) => {
      store.setBackendProcessStatus(data.running)
    })

    window.electronAPI.onBackendLog((data) => {
      const message = String(data.data || '').trim()
      if (!message) return
      store.addLog({
        level: data.type === 'stderr' ? 'warning' : 'info',
        source: 'BACKEND',
        message
      })
    })

    // Electron 环境也启动健康检查，自动连接后端
    store.startHealthCheck()
  } else {
    // 非 Electron 环境：启动健康检查，自动检测后端
    store.addLog({
      level: 'info',
      source: 'SYSTEM',
      message: '独立前端模式：点击"连接后端"或确保后端运行在 localhost:8080'
    })
    store.startHealthCheck()
  }
})

onUnmounted(() => {
  store.disconnectWebSocket({ manual: true })
  store.stopHealthCheck()

  if (uptimeInterval) {
    clearInterval(uptimeInterval)
  }

  if (window.electronAPI) {
    window.electronAPI.removeAllListeners('backend-log')
    window.electronAPI.removeAllListeners('backend-status')
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  padding: 16px;
}

.shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-layout {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 14px;
  gap: 14px;
}

.main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr minmax(340px, 380px);
  gap: 14px;
  align-items: stretch;
}

.left-panel,
.right-top,
.right-bottom {
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  display: flex;
  flex: 1;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.right-top {
  flex: 1 1 55%;
  min-height: 200px;
  max-height: 55%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.right-bottom {
  flex: 1 1 45%;
  min-height: 180px;
  max-height: 45%;
  overflow: hidden;
}

.attack-indicator {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(220, 38, 38, 0.2);
  background: var(--bg-surface-strong);
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(12px);
  z-index: 100;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.16);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #dc2626;
  animation: pulse-dot 1.2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%,
  100% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

.attack-indicator-enter-active,
.attack-indicator-leave-active {
  transition: all 0.25s ease;
}

.attack-indicator-enter-from,
.attack-indicator-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(280px, 0.6fr) minmax(400px, 0.4fr);
  }

  .right-panel {
    flex-direction: row;
  }

  .right-top,
  .right-bottom {
    flex: 1;
    max-height: none;
    min-height: 0;
  }
}

@media (max-width: 900px) {
  .app-container {
    height: auto;
    min-height: 100vh;
    padding: 8px;
  }

  .shell {
    min-height: calc(100vh - 16px);
  }

  .main-layout {
    flex-direction: column;
  }

  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(300px, auto) minmax(500px, auto);
  }

  .right-panel {
    flex-direction: column;
  }

  .right-top {
    flex: none;
    min-height: 320px;
    max-height: 400px;
  }

  .right-bottom {
    flex: none;
    min-height: 200px;
    max-height: 280px;
  }
}
</style>
