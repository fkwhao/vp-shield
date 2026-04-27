<template>
  <div class="dashboard-wrap">
    <header class="header">
      <div>
        <h2>实时流量监控</h2>
        <p>展示当前网络流量变化与异常趋势</p>
      </div>
      <div class="connect-badge" :class="isConnected ? 'online' : 'offline'">
        <span class="status-indicator" :class="isConnected ? 'online' : 'offline'"></span>
        {{ isConnected ? '连接正常' : '等待连接' }}
      </div>
    </header>

    <div class="chart-area">
      <div ref="chartRef" class="chart-container"></div>
      <div v-if="!isConnected" class="chart-mask">
        <span>等待后端数据...</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="metric-card">
        <div class="metric-title">当前 PPS</div>
        <div class="metric-value">{{ formatNumber(stats.currentPps) }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">平均 PPS</div>
        <div class="metric-value">{{ formatNumber(stats.avgPps) }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">峰值 PPS</div>
        <div class="metric-value">{{ formatNumber(stats.peakPps) }}</div>
      </div>
      <div class="metric-card danger">
        <div class="metric-title">已拦截</div>
        <div class="metric-value">{{ stats.blockedCount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  trafficData: { type: Array, default: () => [] },
  isConnected: { type: Boolean, default: false },
  theme: { type: String, default: 'light' },
  stats: {
    type: Object,
    default: () => ({ currentPps: 0, avgPps: 0, peakPps: 0, blockedCount: 0 })
  }
})

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const getPalette = () => {
  const isDark = props.theme === 'dark'
  return {
    tooltipBg: isDark ? 'rgba(13, 18, 28, 0.96)' : 'rgba(255,255,255,0.96)',
    tooltipBorder: isDark ? 'rgba(96, 165, 250, 0.22)' : 'rgba(148,163,184,0.3)',
    tooltipText: isDark ? '#e2e8f0' : '#0f172a',
    axisText: isDark ? '#94a3b8' : '#64748b',
    axisLine: isDark ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.3)',
    splitLine: isDark ? 'rgba(71,85,105,0.22)' : 'rgba(148,163,184,0.2)',
    pointer: isDark ? 'rgba(96,165,250,0.45)' : 'rgba(0,113,227,0.4)'
  }
}

const applyChartOption = () => {
  if (!chartInstance) return

  const palette = getPalette()
  const isDark = props.theme === 'dark'

  chartInstance.setOption({
    backgroundColor: 'transparent',
    grid: { top: 34, right: 18, bottom: 28, left: 45 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: palette.tooltipText, fontSize: 12 },
      axisPointer: { lineStyle: { color: palette.pointer } }
    },
    legend: {
      data: ['正常流量', '异常流量'],
      top: 0,
      right: 8,
      textStyle: { color: palette.axisText, fontSize: 11 }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.trafficData.map((item) => item.time),
      axisLine: { lineStyle: { color: palette.axisLine } },
      axisLabel: { color: palette.axisText, fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: palette.axisText, fontSize: 10, formatter: formatNumber },
      splitLine: { lineStyle: { color: palette.splitLine } }
    },
    series: [
      {
        name: '正常流量',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: isDark ? '#60a5fa' : '#0071e3', width: 2.4 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isDark ? 'rgba(96,165,250,0.24)' : 'rgba(0,113,227,0.24)' },
            { offset: 1, color: isDark ? 'rgba(96,165,250,0.02)' : 'rgba(0,113,227,0.02)' }
          ])
        },
        data: props.trafficData.map((item) => item.normal)
      },
      {
        name: '异常流量',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: isDark ? '#f87171' : '#dc2626', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isDark ? 'rgba(248,113,113,0.22)' : 'rgba(220,38,38,0.22)' },
            { offset: 1, color: isDark ? 'rgba(248,113,113,0.02)' : 'rgba(220,38,38,0.02)' }
          ])
        },
        data: props.trafficData.map((item) => item.abnormal)
      }
    ]
  })
}

const initChart = () => {
  if (!chartRef.value) return

  chartInstance?.dispose()
  chartInstance = echarts.init(chartRef.value)
  applyChartOption()
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(() => props.trafficData, applyChartOption, { deep: true })
watch(() => props.theme, () => {
  nextTick(() => {
    initChart()
  })
})

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)

  if (window.ResizeObserver && chartRef.value) {
    resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(chartRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  resizeObserver?.disconnect()
  chartInstance?.dispose()
})
</script>

<style scoped>
.dashboard-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

h2 {
  font-size: 18px;
  line-height: 1.2;
}

p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.connect-badge {
  height: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  font-size: 12px;
  padding: 6px 10px;
  border: 1px solid var(--line-soft);
  background: var(--bg-surface-strong);
}

.connect-badge.online {
  color: var(--success);
}

.connect-badge.offline {
  color: #6b7280;
}

.chart-area {
  position: relative;
  flex: 1 1 auto;
  min-height: 200px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line-soft);
  background: var(--panel-elevated);
  overflow: hidden;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.chart-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-soft);
  color: var(--text-tertiary);
  font-size: 13px;
}

.stats-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  border-radius: 14px;
  border: 1px solid var(--line-soft);
  background: var(--panel-elevated);
  padding: 10px 12px;
}

.metric-title {
  font-size: 11px;
  color: var(--text-secondary);
}

.metric-value {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 670;
  color: var(--brand);
}

.metric-card.danger .metric-value {
  color: var(--danger);
}

@media (max-width: 1000px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
