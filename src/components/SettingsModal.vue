<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <header class="modal-header">
            <h2>系统设置</h2>
            <button class="close-btn" @click="$emit('close')">&times;</button>
          </header>

          <div class="modal-body">
            <section class="config-section">
              <div class="section-title">抓包配置</div>
              <div class="config-grid">
                <label class="config-item">
                  <span class="label">混杂模式</span>
                  <input type="checkbox" v-model="config.capture.promiscuous" class="soft-toggle" />
                </label>
                <label class="config-item">
                  <span class="label">缓冲区大小 (字节)</span>
                  <input type="number" v-model.number="config.capture.bufferSize" class="soft-input" min="1024" max="1048576" />
                </label>
                <label class="config-item">
                  <span class="label">读取超时 (毫秒)</span>
                  <input type="number" v-model.number="config.capture.readTimeout" class="soft-input" min="10" max="10000" />
                </label>
              </div>
            </section>

            <section class="config-section">
              <div class="section-title">防御配置</div>
              <div class="config-grid">
                <label class="config-item">
                  <span class="label">ICMP 阈值 (包/秒)</span>
                  <input type="number" v-model.number="config.defense.icmpReplyThreshold" class="soft-input" min="1" max="100000" />
                </label>
                <label class="config-item">
                  <span class="label">TCP SYN 阈值 (包/秒)</span>
                  <input type="number" v-model.number="config.defense.tcpSynThreshold" class="soft-input" min="1" max="100000" />
                </label>
                <label class="config-item">
                  <span class="label">UDP 阈值 (包/秒)</span>
                  <input type="number" v-model.number="config.defense.udpThreshold" class="soft-input" min="1" max="100000" />
                </label>
                <label class="config-item">
                  <span class="label">自动封禁</span>
                  <input type="checkbox" v-model="config.defense.autoBlock" class="soft-toggle" />
                </label>
                <label class="config-item">
                  <span class="label">封禁时长 (分钟)</span>
                  <input type="number" v-model.number="config.defense.blockDurationMinutes" class="soft-input" min="0" max="10080" />
                </label>
                <label class="config-item">
                  <span class="label">流量限速</span>
                  <input type="checkbox" v-model="config.defense.rateLimit" class="soft-toggle" />
                </label>
                <label class="config-item">
                  <span class="label">限速恢复时间 (秒)</span>
                  <input type="number" v-model.number="config.defense.rateLimitRecoverySeconds" class="soft-input" min="10" max="3600" />
                </label>
              </div>
            </section>

            <section class="config-section">
              <div class="section-title">攻击模拟配置</div>
              <div class="config-grid">
                <label class="config-item">
                  <span class="label">默认包数量</span>
                  <input type="number" v-model.number="config.attack.defaultPacketCount" class="soft-input" min="1" max="10000" />
                </label>
                <label class="config-item">
                  <span class="label">发送间隔 (毫秒)</span>
                  <input type="number" v-model.number="config.attack.packetIntervalMs" class="soft-input" min="1" max="1000" />
                </label>
              </div>
            </section>
          </div>

          <footer class="modal-footer">
            <button class="soft-button" @click="$emit('close')">取消</button>
            <button class="soft-button primary" @click="saveConfig" :disabled="isSaving">
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const API_BASE = 'http://localhost:8080/api/v1'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'saved'])

const isSaving = ref(false)

const defaultConfig = {
  capture: {
    promiscuous: true,
    bufferSize: 65536,
    readTimeout: 100
  },
  defense: {
    icmpReplyThreshold: 100,
    tcpSynThreshold: 1000,
    udpThreshold: 5000,
    autoBlock: false,
    blockDurationMinutes: 60,
    rateLimit: true,
    rateLimitRecoverySeconds: 60
  },
  attack: {
    defaultPacketCount: 100,
    packetIntervalMs: 10
  }
}

const config = ref(JSON.parse(JSON.stringify(defaultConfig)))

const loadConfig = async () => {
  try {
    const response = await fetch(`${API_BASE}/config`)
    const result = await response.json()
    if (result.success && result.data) {
      config.value = {
        capture: {
          promiscuous: result.data.capture?.promiscuous ?? defaultConfig.capture.promiscuous,
          bufferSize: result.data.capture?.bufferSize ?? defaultConfig.capture.bufferSize,
          readTimeout: result.data.capture?.readTimeout ?? defaultConfig.capture.readTimeout
        },
        defense: {
          icmpReplyThreshold: result.data.defense?.icmpReplyThreshold ?? defaultConfig.defense.icmpReplyThreshold,
          tcpSynThreshold: result.data.defense?.tcpSynThreshold ?? defaultConfig.defense.tcpSynThreshold,
          udpThreshold: result.data.defense?.udpThreshold ?? defaultConfig.defense.udpThreshold,
          autoBlock: result.data.defense?.autoBlock ?? defaultConfig.defense.autoBlock,
          blockDurationMinutes: result.data.defense?.blockDurationMinutes ?? defaultConfig.defense.blockDurationMinutes,
          rateLimit: result.data.defense?.rateLimit ?? defaultConfig.defense.rateLimit,
          rateLimitRecoverySeconds: result.data.defense?.rateLimitRecoverySeconds ?? defaultConfig.defense.rateLimitRecoverySeconds
        },
        attack: {
          defaultPacketCount: result.data.attack?.defaultPacketCount ?? defaultConfig.attack.defaultPacketCount,
          packetIntervalMs: result.data.attack?.packetIntervalMs ?? defaultConfig.attack.packetIntervalMs
        }
      }
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  }
}

const saveConfig = async () => {
  isSaving.value = true
  try {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    const result = await response.json()
    if (result.success) {
      emit('saved')
      emit('close')
    }
  } catch (e) {
    console.error('保存配置失败:', e)
  }
  isSaving.value = false
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadConfig()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 560px;
  height: 85vh;
  max-height: 85vh;
  border-radius: var(--radius-lg);
  background: var(--bg-surface-strong);
  border: 1px solid var(--line-soft);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-soft);
}

.modal-body {
  flex: 1 1 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-section {
  border-radius: var(--radius-lg);
  border: 1px solid var(--line-soft);
  background: var(--panel-elevated);
}

.section-title {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--line-soft);
  background: var(--bg-surface-strong);
}

.config-grid {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.config-item .label {
  font-size: 13px;
  color: var(--text-primary);
}

.soft-input {
  width: 140px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--line-soft);
  background: var(--bg-surface-strong);
  color: var(--text-primary);
  font-size: 13px;
  text-align: right;
  transition: all 0.2s ease;
  -moz-appearance: textfield;
}

.soft-input::-webkit-outer-spin-button,
.soft-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
  opacity: 1;
  width: 18px;
  height: 100%;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.soft-input::-webkit-inner-spin-button::before,
.soft-input::-webkit-inner-spin-button::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}

.soft-input::-webkit-inner-spin-button::before {
  top: 4px;
  border-bottom: 5px solid var(--text-tertiary);
}

.soft-input::-webkit-inner-spin-button::after {
  bottom: 4px;
  border-top: 5px solid var(--text-tertiary);
}

.soft-input:hover {
  border-color: var(--line-strong);
}

.soft-input:hover::-webkit-inner-spin-button::before {
  border-bottom-color: var(--brand);
}

.soft-input:hover::-webkit-inner-spin-button::after {
  border-top-color: var(--brand);
}

.soft-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

.soft-input:focus::-webkit-inner-spin-button::before,
.soft-input:focus::-webkit-inner-spin-button::after {
  border-bottom-color: var(--brand);
  border-top-color: var(--brand);
}

.soft-toggle {
  width: 46px;
  height: 26px;
  appearance: none;
  background: var(--bg-soft);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: background 0.25s ease, box-shadow 0.2s ease;
  border: 1px solid var(--line-soft);
}

.soft-toggle::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.soft-toggle:hover {
  border-color: var(--line-strong);
}

.soft-toggle:hover::before {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.soft-toggle:checked {
  background: var(--brand);
  border-color: transparent;
}

.soft-toggle:checked::before {
  transform: translateX(20px);
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.soft-toggle:checked:hover {
  background: #0062c5;
}

:root[data-theme='dark'] .soft-toggle:checked:hover {
  background: #4b93f4;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--line-soft);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.25s ease;
}
</style>
