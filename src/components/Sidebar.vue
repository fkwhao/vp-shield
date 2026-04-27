<template>
  <aside class="sidebar app-shell-card">
    <div class="logo-block">
      <div class="logo-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z" stroke-width="1.8"/>
          <path d="M9.2 12.2l1.9 1.9 3.9-4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="logo-title">VP Shield</div>
        <div class="logo-sub">Defense Center</div>
      </div>
    </div>

    <section class="panel">
      <div class="panel-title">系统状态</div>
      <div class="status-list">
        <div class="status-item">
          <span class="status-indicator" :class="backendStatus"></span>
          <span>后端服务</span>
        </div>
        <div class="status-item">
          <span class="status-indicator" :class="wsStatus"></span>
          <span>WebSocket</span>
        </div>
        <div class="status-item">
          <span class="status-indicator" :class="defenseStatus"></span>
          <span>防护引擎</span>
        </div>
        <div class="status-item" v-if="emergencyMode">
          <span class="status-indicator emergency"></span>
          <span class="emergency-text">紧急防御</span>
        </div>
      </div>
      <div v-if="emergencyMode" class="emergency-banner">
        <div class="emergency-title">紧急防御已激活</div>
        <div class="emergency-reason">{{ emergencyReason || '系统正在防护中' }}</div>
        <button class="recover-btn" @click="$emit('recoverEmergency')">恢复正常</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">关键指标</div>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ formatDuration(stats.uptime) }}</span>
          <span class="stat-label">运行时长</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.activeConnections }}</span>
          <span class="stat-label">活跃连接</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.threatLevel }}</span>
          <span class="stat-label">威胁等级</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.blockedToday }}</span>
          <span class="stat-label">今日拦截</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">快捷操作</div>
      <div class="action-grid">
        <button class="soft-button primary" @click="$emit('startBackend')" :disabled="backendStatus === 'online'">
          {{ isElectron ? '启动服务' : '连接后端' }}
        </button>
        <button class="soft-button danger" @click="$emit('stopBackend')" :disabled="backendStatus !== 'online'">
          {{ isElectron ? '停止服务' : '断开连接' }}
        </button>
        <button class="soft-button warning" @click="$emit('triggerEmergency')" :disabled="backendStatus !== 'online' || emergencyMode">
          紧急防御
        </button>
        <button class="soft-button" @click="$emit('exportLogs')">导出日志</button>
        <button class="soft-button" @click="$emit('openSettings')">系统设置</button>
      </div>
    </section>

    <footer class="sidebar-footer">
      <span>Version 1.0.0</span>
      <span>VP Shield Frontend</span>
    </footer>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  backendStatus: { type: String, default: 'offline' },
  wsStatus: { type: String, default: 'offline' },
  defenseStatus: { type: String, default: 'offline' },
  emergencyMode: { type: Boolean, default: false },
  emergencyReason: { type: String, default: '' },
  stats: {
    type: Object,
    default: () => ({
      uptime: 0,
      activeConnections: 0,
      threatLevel: 'LOW',
      blockedToday: 0
    })
  }
})

defineEmits(['startBackend', 'stopBackend', 'exportLogs', 'openSettings', 'triggerEmergency', 'recoverEmergency'])

const isElectron = computed(() => Boolean(window.electronAPI))

const formatDuration = (seconds) => {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    return `${mins}m`
  }
  return `${seconds}s`
}
</script>

<style scoped>
.sidebar {
  width: 270px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logo-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface-strong);
  border: 1px solid var(--line-soft);
}

.logo-mark {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--brand-soft);
  color: var(--brand);
}

.logo-mark svg {
  width: 22px;
  height: 22px;
}

.logo-title {
  font-size: 16px;
  font-weight: 650;
}

.logo-sub {
  font-size: 12px;
  color: var(--text-tertiary);
}

.panel {
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-lg);
  background: var(--bg-surface-strong);
}

.panel-title {
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  border-radius: 12px;
  border: 1px solid var(--line-soft);
  background: var(--panel-elevated);
  padding: 10px;
}

.stat-value {
  font-size: 14px;
  font-weight: 650;
}

.stat-label {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.status-indicator.emergency {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

.emergency-text {
  color: #f59e0b;
  font-weight: 600;
}

.emergency-banner {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.emergency-title {
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
}

.emergency-reason {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.recover-btn {
  margin-top: 8px;
  width: 100%;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.recover-btn:hover {
  background: rgba(245, 158, 11, 0.3);
}

.soft-button.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.soft-button.warning:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.25);
}

.soft-button.warning:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}

@media (max-width: 1100px) {
  .sidebar {
    width: 100%;
  }
}
</style>
