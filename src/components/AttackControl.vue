<template>
  <div class="control-wrap">
    <header class="header">
      <div>
        <h2>攻击模拟与防护控制</h2>
        <p>用于抓包监控、回环测试和封禁管理</p>
      </div>
      <span class="run-badge" :class="isRunning ? 'active' : ''">{{ isRunning ? '测试运行中' : '待机' }}</span>
    </header>

    <div class="body">
      <section class="section-card">
        <div class="section-head">
          <span>1. 选择网络接口</span>
          <button class="soft-button" @click="loadInterfaces" :disabled="isLoadingInterfaces">
            {{ isLoadingInterfaces ? '刷新中...' : '刷新' }}
          </button>
        </div>
        <div class="section-body">
          <select v-model="selectedInterface" class="soft-select" :disabled="isLoading || isLoadingInterfaces" @change="onInterfaceChange">
            <option value="">请选择网卡</option>
            <option v-for="iface in interfaces" :key="iface.name" :value="iface.name">
              {{ formatInterfaceName(iface) }}
            </option>
          </select>

          <div v-if="selectedInterfaceInfo" class="iface-hint">
            <div>{{ selectedInterfaceInfo.description || selectedInterfaceInfo.name }}</div>
            <div class="meta">
              <span v-if="selectedInterfaceInfo.ipAddresses?.length">{{ selectedInterfaceInfo.ipAddresses[0] }}</span>
              <span v-if="selectedInterfaceInfo.macAddress">{{ selectedInterfaceInfo.macAddress }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-head">
          <span>2. 抓包监控</span>
          <span class="light-pill" :class="isCapturing ? 'on' : ''">{{ isCapturing ? '已开启' : '未开启' }}</span>
        </div>
        <div class="section-body split-actions">
          <button v-if="!isCapturing" class="soft-button primary" @click="startCapture" :disabled="isLoading || !selectedInterface">启动监控</button>
          <button v-else class="soft-button danger" @click="stopCapture" :disabled="isLoading">停止监控</button>
        </div>
      </section>

      <section class="section-card">
        <div class="section-head"><span>3. 测试配置</span></div>
        <div class="section-body sliders">
          <label class="slider-group">
            <div class="slider-row">
              <span>模拟包数量</span>
              <strong>{{ packetCount }}</strong>
            </div>
            <input v-model="packetCount" type="range" min="50" max="2000" step="50" class="soft-range" :disabled="isRunning" />
            <div class="marks"><span>50</span><span>1000</span><span>2000</span></div>
          </label>

          <label class="slider-group">
            <div class="slider-row">
              <span>攻击源数量</span>
              <strong>{{ sourceIpCount }}</strong>
            </div>
            <input v-model="sourceIpCount" type="range" min="1" max="50" step="1" class="soft-range" :disabled="isRunning" />
            <div class="marks"><span>1</span><span>25</span><span>50</span></div>
          </label>

          <div class="split-actions">
            <button v-if="!isRunning" class="soft-button primary" @click="startTest" :disabled="isLoading || !isCapturing">启动回环测试</button>
            <button v-else class="soft-button danger" @click="stopTest">停止测试</button>
          </div>

          <div v-if="packetsSent > 0" class="progress">
            <div class="bar">
              <div class="fill" :style="{ width: Math.min(100, (packetsSent / packetCount) * 100) + '%' }"></div>
            </div>
            <div class="hint">{{ packetsSent }} / {{ packetCount }}</div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-head">
          <span>封禁列表</span>
          <div class="split-actions compact">
            <button class="soft-button" @click="resetDefense" :disabled="isLoading">重置防护</button>
            <button v-if="blockedIps.length" class="soft-button danger" @click="clearAllBlocks" :disabled="isLoading">清空</button>
          </div>
        </div>
        <div class="section-body">
          <div v-if="blockedIps.length === 0" class="empty">暂无封禁 IP</div>
          <div v-else class="blocked-list">
            <div v-for="block in blockedIps" :key="block.ip" class="blocked-item">
              <div>
                <div class="ip">{{ block.ip }}</div>
                <div class="reason">{{ block.reason }}</div>
              </div>
              <button class="soft-button" @click="unblockIp(block.ip)" :disabled="isLoading">解封</button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="rateLimitEnabled" class="alert-card">
        <div>
          <div class="alert-title">流量限速已启用</div>
          <div class="alert-desc">系统检测到攻击，已自动开启限速保护。</div>
        </div>
        <button class="soft-button" @click="disableRateLimit" :disabled="isLoading">关闭限速</button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const API_BASE = 'http://localhost:8080/api/v1'
const emit = defineEmits(['log'])

const packetCount = ref(200)
const sourceIpCount = ref(5)
const isRunning = ref(false)
const isCapturing = ref(false)
const isLoading = ref(false)
const packetsSent = ref(0)
const interfaces = ref([])
const selectedInterface = ref('')
const isLoadingInterfaces = ref(false)
const blockedIps = ref([])
const rateLimitEnabled = ref(false)
const allowRemoteStateSync = ref(false)

let statusInterval = null

const selectedInterfaceInfo = computed(() => {
  if (!selectedInterface.value) return null
  return interfaces.value.find((i) => i.name === selectedInterface.value)
})

const api = {
  async get(url) {
    const response = await fetch(`${API_BASE}${url}`)
    return response.json()
  },
  async post(url, data = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },
  async del(url) {
    const response = await fetch(`${API_BASE}${url}`, { method: 'DELETE' })
    return response.json()
  }
}

const loadInterfaces = async () => {
  isLoadingInterfaces.value = true
  try {
    const result = await api.get('/interfaces')
    if (result.success && result.data) {
      interfaces.value = result.data
      emit('log', { level: 'info', source: 'CAPTURE', message: `已加载 ${result.data.length} 个网络接口` })
    }
  } catch (e) {
    emit('log', { level: 'danger', source: 'CAPTURE', message: `加载网络接口失败: ${e.message}` })
  }
  isLoadingInterfaces.value = false
}

const formatInterfaceName = (iface) => {
  const ip = iface.ipAddresses?.[0] || 'No IP'
  const status = iface.up ? '●' : '○'
  const desc = iface.description?.substring(0, 25) || iface.name
  return `${status} ${desc} (${ip})`
}

const onInterfaceChange = () => {
  if (selectedInterface.value && selectedInterfaceInfo.value) {
    emit('log', {
      level: 'info',
      source: 'CAPTURE',
      message: `已选择接口: ${selectedInterfaceInfo.value.description || selectedInterfaceInfo.value.name}`
    })
  }
}

const startCapture = async () => {
  if (!selectedInterface.value) {
    emit('log', { level: 'warning', source: 'CAPTURE', message: '请先选择网卡，再启动抓包' })
    return
  }

  isLoading.value = true
  try {
    const payload = { interfaceName: selectedInterface.value }
    const result = await api.post('/capture/start', payload)
    if (result.success) {
      isCapturing.value = true
      allowRemoteStateSync.value = true
      emit('log', { level: 'success', source: 'CAPTURE', message: '抓包监控已启动' })
    } else {
      emit('log', { level: 'danger', source: 'CAPTURE', message: result.message || '启动抓包失败' })
    }
  } catch (e) {
    emit('log', { level: 'danger', source: 'CAPTURE', message: `连接失败: ${e.message}` })
  }
  isLoading.value = false
}

const stopCapture = async () => {
  isLoading.value = true
  try {
    await api.post('/capture/stop')
    isCapturing.value = false
    allowRemoteStateSync.value = true
    emit('log', { level: 'info', source: 'CAPTURE', message: '抓包监控已停止' })
  } catch (e) {
    emit('log', { level: 'danger', source: 'CAPTURE', message: `停止抓包失败: ${e.message}` })
  }
  isLoading.value = false
}

const startTest = async () => {
  isLoading.value = true
  try {
    const result = await api.post('/test/start', {
      packetCount: packetCount.value,
      sourceIpCount: sourceIpCount.value
    })
    if (result.success) {
      isRunning.value = true
      allowRemoteStateSync.value = true
      emit('log', {
        level: 'warning',
        source: 'TEST',
        message: `回环测试已启动：${packetCount.value} 包，${sourceIpCount.value} 源`
      })
    } else {
      emit('log', { level: 'danger', source: 'TEST', message: result.message || '测试启动失败' })
    }
  } catch (e) {
    emit('log', { level: 'danger', source: 'TEST', message: `连接失败: ${e.message}` })
  }
  isLoading.value = false
}

const stopTest = async () => {
  isLoading.value = true
  try {
    await api.post('/test/stop')
    isRunning.value = false
    allowRemoteStateSync.value = true
    emit('log', { level: 'info', source: 'TEST', message: '回环测试已停止' })
  } catch (e) {
    emit('log', { level: 'danger', source: 'TEST', message: `停止测试失败: ${e.message}` })
  }
  isLoading.value = false
}

const loadBlockedIps = async () => {
  try {
    const result = await api.get('/block/list')
    if (result.success && result.data) blockedIps.value = result.data
  } catch (e) {}
}

const unblockIp = async (ip) => {
  isLoading.value = true
  try {
    const result = await api.del(`/block/${ip}`)
    if (result.success) {
      emit('log', { level: 'success', source: 'DEFENSE', message: `IP 已解封: ${ip}` })
      await loadBlockedIps()
    }
  } catch (e) {
    emit('log', { level: 'danger', source: 'DEFENSE', message: `解封失败: ${e.message}` })
  }
  isLoading.value = false
}

const clearAllBlocks = async () => {
  isLoading.value = true
  try {
    const result = await api.post('/block/clear')
    if (result.success) {
      emit('log', { level: 'success', source: 'DEFENSE', message: '已清空全部封禁记录' })
      await loadBlockedIps()
    }
  } catch (e) {
    emit('log', { level: 'danger', source: 'DEFENSE', message: `清空失败: ${e.message}` })
  }
  isLoading.value = false
}

const resetDefense = async () => {
  isLoading.value = true
  try {
    const result = await api.post('/defense/reset')
    if (result.success) {
      rateLimitEnabled.value = false
      emit('log', { level: 'success', source: 'DEFENSE', message: '防护状态已重置' })
      await loadBlockedIps()
    }
  } catch (e) {
    emit('log', { level: 'danger', source: 'DEFENSE', message: `重置失败: ${e.message}` })
  }
  isLoading.value = false
}

const disableRateLimit = async () => {
  isLoading.value = true
  try {
    const result = await api.post('/ratelimit/disable')
    if (result.success) {
      rateLimitEnabled.value = false
      emit('log', { level: 'success', source: 'DEFENSE', message: '限速已关闭' })
    }
  } catch (e) {
    emit('log', { level: 'danger', source: 'DEFENSE', message: `关闭限速失败: ${e.message}` })
  }
  isLoading.value = false
}

const loadRateLimitStatus = async () => {
  try {
    const result = await api.get('/ratelimit/status')
    if (result.success) rateLimitEnabled.value = result.data
  } catch (e) {}
}

const resetRuntimeStateSilently = async () => {
  try {
    await api.post('/capture/stop')
  } catch (e) {}

  try {
    await api.post('/test/stop')
  } catch (e) {}

  isCapturing.value = false
  isRunning.value = false
  packetsSent.value = 0
  allowRemoteStateSync.value = false
}

const checkStatus = async ({ force = false } = {}) => {
  try {
    if (force || allowRemoteStateSync.value) {
      const result = await api.get('/status')
      if (result.success && result.data) {
        isCapturing.value = result.data.capturing
        packetsSent.value = result.data.packetsSent || 0
      }

      const testStatus = await api.get('/test/status')
      if (testStatus.success) isRunning.value = testStatus.data
    }

    loadBlockedIps()
    loadRateLimitStatus()
  } catch (e) {}
}

onMounted(() => {
  loadInterfaces()
  loadRateLimitStatus()
  // 启动时重置抓包和测试状态，保持“先选网卡再启动”流程
  resetRuntimeStateSilently().finally(() => {
    checkStatus({ force: false })
  })
  statusInterval = setInterval(checkStatus, 2000)
})

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval)
})
</script>

<style scoped>
.control-wrap {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

h2 {
  font-size: 16px;
  line-height: 1.25;
}

p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.run-badge {
  height: fit-content;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  background: var(--bg-soft);
  color: var(--text-secondary);
  white-space: nowrap;
}

.run-badge.active {
  background: rgba(217, 119, 6, 0.12);
  color: var(--warning);
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}

.section-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--line-soft);
  background: var(--panel-elevated);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}

.section-card:hover {
  border-color: var(--line-strong);
}

.section-head {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.section-body {
  padding: 12px;
}

.iface-hint {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 113, 227, 0.2);
  background: rgba(0, 113, 227, 0.06);
  font-size: 11px;
}

.meta {
  margin-top: 2px;
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.split-actions {
  display: flex;
  gap: 8px;
}

.split-actions.compact {
  gap: 6px;
}

.light-pill {
  border-radius: 999px;
  font-size: 11px;
  padding: 3px 8px;
  color: var(--text-secondary);
  background: var(--bg-soft);
}

.light-pill.on {
  color: var(--success);
  background: rgba(22, 163, 74, 0.12);
}

.sliders {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-group {
  display: block;
}

.slider-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.slider-row strong {
  color: var(--brand);
}

.marks {
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-tertiary);
}

.progress .bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-soft);
  overflow: hidden;
}

.progress .fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand) 0%, #0ea5e9 100%);
  transition: width 0.3s ease;
}

.progress .hint {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}

.empty {
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-soft);
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
}

.blocked-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow: auto;
}

.blocked-item {
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.2);
  background: rgba(220, 38, 38, 0.06);
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.ip {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--danger);
}

.reason {
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 11px;
}

.alert-card {
  border-radius: var(--radius-lg);
  border: 1px solid rgba(217, 119, 6, 0.3);
  background: rgba(217, 119, 6, 0.1);
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.alert-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--warning);
}

.alert-desc {
  margin-top: 3px;
  font-size: 11px;
  color: var(--warning);
  opacity: 0.75;
}

@media (max-width: 1300px) {
  .split-actions {
    flex-wrap: wrap;
  }
}
</style>
