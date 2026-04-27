<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-card">
          <button class="modal-close" @click="handleClose" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
            </svg>
          </button>

          <div class="modal-header">
            <div class="modal-icon" :class="alertType">
              <svg v-if="alertType === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 9v3m0 4h.01M10.3 3.8L1.8 18.2A2 2 0 003.5 21h17a2 2 0 001.7-2.8L13.7 3.8a2 2 0 00-3.4 0z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else-if="alertType === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 9v4m0 4h.01M12 3l9 16H3l9-16z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="modal-title">{{ title }}</h3>
          </div>

          <p class="modal-message">{{ message }}</p>

          <div v-if="details" class="modal-details">
            <div v-for="(value, key) in details" :key="key" class="detail-row">
              <span class="detail-label">{{ key }}</span>
              <span class="detail-value">{{ value }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="action-btn secondary" @click="handleClose">我知道了</button>
            <button v-if="alertType === 'danger'" class="action-btn primary" @click="handleAction">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round"/>
              </svg>
              立即处理
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '安全警告'
  },
  message: {
    type: String,
    default: ''
  },
  alertType: {
    type: String,
    default: 'danger'
  },
  details: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'action'])

const handleClose = () => emit('close')
const handleAction = () => emit('action')
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 1000;
  padding: 16px;
}

:root[data-theme='dark'] .modal-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.modal-card {
  position: relative;
  width: min(420px, calc(100vw - 32px));
  padding: 24px;
  border-radius: 20px;
  border: 1px solid var(--line-soft);
  background: var(--bg-surface-strong);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
}

:root[data-theme='dark'] .modal-card {
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.modal-close {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid var(--line-soft);
  background: var(--bg-soft);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: var(--panel-elevated);
  color: var(--text-primary);
}

.modal-close svg {
  width: 16px;
  height: 16px;
}

.modal-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-right: 32px;
}

.modal-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.modal-icon svg {
  width: 28px;
  height: 28px;
}

.modal-icon.danger {
  color: var(--danger);
  background: rgba(220, 38, 38, 0.1);
}

:root[data-theme='dark'] .modal-icon.danger {
  background: rgba(248, 113, 113, 0.15);
}

.modal-icon.warning {
  color: var(--warning);
  background: rgba(217, 119, 6, 0.1);
}

:root[data-theme='dark'] .modal-icon.warning {
  background: rgba(251, 191, 36, 0.15);
}

.modal-icon.info {
  color: var(--brand);
  background: var(--brand-soft);
}

.modal-title {
  font-size: 18px;
  font-weight: 650;
  text-align: center;
  color: var(--text-primary);
}

.modal-message {
  margin-top: 8px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.modal-details {
  margin-top: 16px;
  border-radius: 14px;
  border: 1px solid var(--line-soft);
  background: var(--bg-soft);
  padding: 12px 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line-soft);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--text-secondary);
}

.detail-value {
  color: var(--text-primary);
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.action-btn.secondary {
  border: 1px solid var(--line-soft);
  background: var(--bg-surface-strong);
  color: var(--text-primary);
}

.action-btn.secondary:hover {
  background: var(--bg-soft);
  border-color: var(--line-strong);
}

.action-btn.primary {
  border: none;
  background: var(--brand);
  color: #fff;
}

.action-btn.primary:hover {
  filter: brightness(1.1);
}

:root[data-theme='dark'] .action-btn.primary:hover {
  filter: brightness(1.15);
}

/* Modal animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.95) translateY(10px);
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.25s ease;
}
</style>
