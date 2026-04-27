<template>
  <div class="title-bar">
    <div class="window-controls">
      <button class="dot danger" @click="close" title="关闭" aria-label="关闭"></button>
      <button class="dot warning" @click="minimize" title="最小化" aria-label="最小化"></button>
      <button class="dot success" @click="maximize" title="最大化" aria-label="最大化"></button>
    </div>

    <div class="title-meta">
      <div class="app-name">VP Shield</div>
      <div class="app-desc">Network Defense Console</div>
    </div>

    <div class="title-actions">
      <button class="theme-toggle soft-button" @click="$emit('toggleTheme')" type="button">
        {{ theme === 'dark' ? '切换日间' : '切换夜间' }}
      </button>

      <div class="backend-pill" :class="backendStatus">
        <span class="status-indicator" :class="backendStatus"></span>
        <span>{{ statusText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  backendStatus: { type: String, default: 'offline' },
  theme: { type: String, default: 'light' }
})

defineEmits(['toggleTheme'])

const statusText = computed(() => {
  if (props.backendStatus === 'online') return 'Backend Online'
  if (props.backendStatus === 'warning') return 'Backend Reachable'
  return 'Backend Offline'
})

const minimize = () => {
  if (window.electronAPI) {
    window.electronAPI.minimizeWindow()
  }
}

const maximize = () => {
  if (window.electronAPI) {
    window.electronAPI.maximizeWindow()
  }
}

const close = () => {
  if (window.electronAPI) {
    window.electronAPI.closeWindow()
  }
}
</script>

<style scoped>
.title-bar {
  -webkit-app-region: drag;
  height: 54px;
  border-bottom: 1px solid var(--line-soft);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 18px;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.dot:hover {
  transform: scale(1.08);
}

.dot.danger { background: #ff5f57; }
.dot.warning { background: #ffbd2e; }
.dot.success { background: #28c840; }

.title-meta {
  text-align: center;
}

.app-name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.app-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}

.title-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
}

.theme-toggle {
  padding-inline: 12px;
}

.backend-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid var(--line-soft);
  background: var(--bg-surface-strong);
}

.backend-pill.online {
  color: var(--success);
}

.backend-pill.warning {
  color: var(--warning);
}

.backend-pill.offline {
  color: #6b7280;
}

@media (max-width: 900px) {
  .title-bar {
    grid-template-columns: auto 1fr;
    gap: 10px;
    height: 50px;
    padding: 0 12px;
  }

  .title-meta {
    text-align: left;
  }

  .backend-pill {
    display: none;
  }
}
</style>
