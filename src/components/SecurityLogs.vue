<template>
  <div class="logs-wrap">
    <header class="header">
      <div>
        <h2>安全审计日志</h2>
        <p>查看系统、测试和防护事件</p>
      </div>
      <div class="actions">
        <select v-model="filterLevel" class="soft-select small">
          <option value="all">全部</option>
          <option value="info">信息</option>
          <option value="warning">警告</option>
          <option value="danger">危险</option>
          <option value="success">成功</option>
        </select>
        <button class="soft-button" @click="clearLogs">清空</button>
      </div>
    </header>

    <div class="stats-row">
      <span>信息 {{ stats.info }}</span>
      <span>警告 {{ stats.warning }}</span>
      <span>危险 {{ stats.danger }}</span>
      <span>成功 {{ stats.success }}</span>
      <span class="total">共 {{ filteredLogs.length }} 条</span>
    </div>

    <div ref="terminalRef" class="log-list">
      <div v-if="filteredLogs.length === 0" class="empty">暂无日志记录</div>
      <div v-for="(log, index) in filteredLogs" :key="index" class="log-item" :class="log.level">
        <span class="time">{{ log.timestamp }}</span>
        <span class="level">[{{ log.level.toUpperCase() }}]</span>
        <span v-if="log.source" class="source">[{{ log.source }}]</span>
        <span class="message">{{ log.message }}</span>
      </div>
    </div>

    <footer class="footer">
      <div class="live">
        <span class="status-indicator" :class="isLive ? 'online' : 'offline'"></span>
        <span>{{ isLive ? '实时更新中' : '连接已暂停' }}</span>
      </div>
      <label class="toggle">
        <input type="checkbox" v-model="autoScroll" />
        <span>自动滚动</span>
      </label>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  },
  isLive: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['clear'])

const terminalRef = ref(null)
const filterLevel = ref('all')
const autoScroll = ref(true)

const stats = computed(() => ({
  info: props.logs.filter((l) => l.level === 'info').length,
  warning: props.logs.filter((l) => l.level === 'warning').length,
  danger: props.logs.filter((l) => l.level === 'danger').length,
  success: props.logs.filter((l) => l.level === 'success').length
}))

const filteredLogs = computed(() => {
  if (filterLevel.value === 'all') return props.logs
  return props.logs.filter((log) => log.level === filterLevel.value)
})

const scrollToBottom = () => {
  if (!autoScroll.value || !terminalRef.value) return
  nextTick(() => {
    terminalRef.value.scrollTop = 0
  })
}

watch(() => props.logs.length, scrollToBottom)

const clearLogs = () => emit('clear')
</script>

<style scoped>
.logs-wrap {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

h2 {
  font-size: 16px;
  line-height: 1.2;
}

p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: 8px;
}

.soft-select.small {
  width: 100px;
  height: 34px;
  padding: 6px 32px 6px 10px;
  border-radius: 999px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

:root[data-theme='dark'] .soft-select.small {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23a8b3c7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
}

.soft-select.small:hover {
  border-color: var(--line-strong);
}

.stats-row {
  margin-top: 12px;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: var(--panel-elevated);
  padding: 8px 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
}

.total {
  margin-left: auto;
  color: var(--text-primary);
}

.log-list {
  margin-top: 10px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line-soft);
  background: var(--panel-elevated);
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.log-item {
  border-radius: 10px;
  padding: 8px 10px;
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.4;
  border: 1px solid transparent;
  animation: logFadeIn 0.25s ease-out;
}

@keyframes logFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-item.info {
  background: var(--bg-soft);
}

.log-item.warning {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.2);
}

.log-item.danger {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.2);
}

.log-item.success {
  background: rgba(22, 163, 74, 0.1);
  border-color: rgba(22, 163, 74, 0.2);
}

.time,
.level,
.source {
  margin-right: 8px;
  color: var(--text-secondary);
}

.message {
  color: var(--text-primary);
}

.empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.footer {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.live {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 700px) {
  .header {
    flex-direction: column;
  }

  .actions {
    width: 100%;
  }

  .actions .soft-button,
  .actions .soft-select.small {
    width: 100%;
  }
}
</style>
