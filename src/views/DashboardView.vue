<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>智慧城市运行态势感知系统</h1>
      <div class="header-actions">
        <router-link
          to="/upload"
          class="nav-link"
        >
          数据上传
        </router-link>
        <router-link
          to="/list"
          class="nav-link"
        >
          数据列表
        </router-link>
        <router-link
          to="/warnings"
          class="nav-link"
        >
          预警管理
        </router-link>
      </div>
    </div>

    <div class="dashboard-content">
      <!-- 顶部指标卡片 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon">
            📊
          </div>
          <div class="metric-info">
            <div class="metric-label">
              今日事件数
            </div>
            <div class="metric-value">
              {{ todayEventCount }}
            </div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">
            ⚠️
          </div>
          <div class="metric-info">
            <div class="metric-label">
              异常设备数
            </div>
            <div class="metric-value">
              {{ statistics.abnormalSensors }}
            </div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">
            🔥
          </div>
          <div class="metric-info">
            <div class="metric-label">
              高优先级问题数
            </div>
            <div class="metric-value">
              {{ highPriorityCount }}
            </div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">
            ⏱️
          </div>
          <div class="metric-info">
            <div class="metric-label">
              平均响应时长
            </div>
            <div class="metric-value">
              {{ averageResponseTime }}
            </div>
            <div class="metric-unit">
              分钟
            </div>
          </div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <!-- 左侧：热力图和事件类型分布 -->
        <div class="left-panel">
          <div class="chart-card">
            <h3>问题分布热力图</h3>
            <div
              ref="heatmapRef"
              class="chart-container"
            />
          </div>
          <div class="chart-card">
            <h3>事件类型分布</h3>
            <div
              ref="eventTypeChartRef"
              class="chart-container"
            />
          </div>
        </div>

        <!-- 中间：问题类型环形图和区域分布统计 -->
        <div class="center-panel">
          <div class="chart-card">
            <h3>问题类型环形图</h3>
            <div
              ref="problemTypeChartRef"
              class="chart-container"
            />
          </div>
          <div class="chart-card">
            <h3>区域分布统计</h3>
            <div
              ref="districtChartRef"
              class="chart-container"
            />
          </div>
        </div>

        <!-- 右侧：趋势图和传感器类型分布 -->
        <div class="right-panel">
          <div class="chart-card">
            <h3>近期问题趋势</h3>
            <div
              ref="trendChartRef"
              class="chart-container"
            />
          </div>
          <div class="chart-card">
            <h3>传感器类型分布</h3>
            <div
              ref="sensorTypeChartRef"
              class="chart-container"
            />
          </div>
        </div>
      </div>

      <!-- 底部：实时事件流 -->
      <div class="event-stream">
        <div class="stream-header">
          <h3>实时事件流</h3>
          <div class="stream-controls">
            <el-button 
              :type="isStreaming ? 'warning' : 'primary'"
              @click="toggleStream"
            >
              {{ isStreaming ? '⏸ 暂停' : '▶ 播放' }}
            </el-button>
            <el-button @click="resetStream">
              重置
            </el-button>
          </div>
        </div>
        <div
          ref="streamContentRef"
          class="stream-content"
        >
          <div
            v-if="displayedEvents.length === 0"
            class="stream-empty"
          >
            <div class="empty-icon">
              📭
            </div>
            <p>暂无事件数据</p>
            <p class="empty-hint">
              请上传数据后查看实时事件流
            </p>
          </div>
          <div 
            v-for="event in displayedEvents"
            v-else 
            :key="event.id"
            :class="['stream-item', { 'new': event.isNew }]"
          >
            <span class="stream-time">{{ formatTime(event.reportTime) }}</span>
            <span class="stream-type">{{ event.type }}</span>
            <span class="stream-location">{{ event.location.district }} {{ event.location.street }}</span>
            <span
              class="stream-status"
              :class="`status-${event.status}`"
            >{{ event.status }}</span>
            <span
              v-if="event.isNew"
              class="new-badge"
            >NEW</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
// 引入中国地图 GeoJSON 并注册
// 需要依赖 echarts 自带的地图 JSON（vite 支持导入 json）
// 如果构建环境无此文件，可将 JSON 放到本地 assets 后改为相对路径引入
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import beijing from '@/assets/geojson/beijing.json'
import dayjs from 'dayjs'

const dataStore = useDataStore()

// 图表引用
const heatmapRef = ref<HTMLElement | null>(null)
const districtChartRef = ref<HTMLElement | null>(null)
const eventTypeChartRef = ref<HTMLElement | null>(null)
const sensorTypeChartRef = ref<HTMLElement | null>(null)
const trendChartRef = ref<HTMLElement | null>(null)
const problemTypeChartRef = ref<HTMLElement | null>(null)

// 图表实例
let heatmapChart: echarts.ECharts | null = null
let districtChart: echarts.ECharts | null = null
let eventTypeChart: echarts.ECharts | null = null
let sensorTypeChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null
let problemTypeChart: echarts.ECharts | null = null

// 实时事件流
const isStreaming = ref(false)
const streamIndex = ref(0)
const displayedEvents = ref<Array<any & { isNew?: boolean }>>([])
const streamContentRef = ref<HTMLElement | null>(null)
let streamTimer: number | null = null

// 计算属性
const statistics = computed(() => dataStore.statistics)
const todayEventCount = computed(() => dataStore.todayEventCount)
const highPriorityCount = computed(() => dataStore.highPriorityCount)

// 平均响应时长（模拟数据）
// 根据事件数量和状态模拟计算平均响应时长
const averageResponseTime = computed(() => {
  const events = dataStore.events
  if (events.length === 0) return 0
  
  // 模拟计算：根据事件状态和数量生成合理的响应时长
  // 已处理的事件响应时间较短，未处理的事件响应时间较长
  const processedCount = events.filter(e => e.status === '已派单' || e.status === '处理中').length
  const totalCount = events.length
  
  // 模拟算法：已处理事件平均15分钟，未处理事件平均45分钟
  const processedTime = processedCount * 15
  const unprocessedTime = (totalCount - processedCount) * 45
  const average = Math.round((processedTime + unprocessedTime) / totalCount)
  
  return average
})

// 初始化图表
onMounted(() => {
  nextTick(() => {
    initCharts()
    startEventStream()
  })
})

onUnmounted(() => {
  destroyCharts()
  stopEventStream()
})

// 监听数据变化，更新图表
watch(() => dataStore.events, () => {
  updateCharts()
}, { deep: true })

watch(() => dataStore.sensors, () => {
  updateCharts()
}, { deep: true })

// 初始化所有图表
function initCharts() {
  // 注册中国地图，避免 "Map china not exists" 错误
  try {
    echarts.registerMap('beijing', beijing as any)
  } catch (e) {
    // 已注册或加载失败时忽略，后续 setOption 会继续执行
  }
  if (heatmapRef.value) {
    heatmapChart = echarts.init(heatmapRef.value)
  }
  if (districtChartRef.value) {
    districtChart = echarts.init(districtChartRef.value)
  }
  if (eventTypeChartRef.value) {
    eventTypeChart = echarts.init(eventTypeChartRef.value)
  }
  if (sensorTypeChartRef.value) {
    sensorTypeChart = echarts.init(sensorTypeChartRef.value)
  }
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (problemTypeChartRef.value) {
    problemTypeChart = echarts.init(problemTypeChartRef.value)
  }
  updateCharts()
}

// 更新所有图表
function updateCharts() {
  updateHeatmap()
  updateDistrictChart()
  updateEventTypeChart()
  updateSensorTypeChart()
  updateTrendChart()
  updateProblemTypeChart()
}

// 更新热力图
function updateHeatmap() {
  if (!heatmapChart) return

  const data = dataStore.events.map(event => [
    event.location.lng,
    event.location.lat,
    1
  ])

  // 如果没有数据，显示空状态
  if (data.length === 0) {
    heatmapChart.setOption({
      backgroundColor: 'transparent',
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: '📍',
                fontSize: 48,
                y: 0
              }
            },
            {
              type: 'text',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'bold',
                y: 60
              }
            },
            {
              type: 'text',
              style: {
                text: '请上传数据后查看问题分布热力图',
                fontSize: 12,
                fill: 'rgba(255, 255, 255, 0.5)',
                y: 85
              }
            }
          ]
        }
      ]
    })
    return
  }

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#4a90e2',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: (params: any) => {
        if (params.seriesType === 'scatter') {
          return `位置: ${params.value[0]}, ${params.value[1]}<br/>事件数量: ${params.value[2]}`
        }
        return params.name
      }
    },
    geo: {
      map: 'beijing',
      roam: true,
      zoom: 1.2,
      itemStyle: {
        areaColor: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#1a2f4a' },
            { offset: 1, color: '#0f1a2e' }
          ]
        },
        borderColor: '#4a90e2',
        borderWidth: 1.5,
        shadowColor: 'rgba(74, 144, 226, 0.5)',
        shadowBlur: 10
      },
      emphasis: {
        itemStyle: {
          areaColor: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#2d5a87' },
              { offset: 1, color: '#1a3a5f' }
            ]
          },
          borderColor: '#50c9ff',
          borderWidth: 2
        },
        label: {
          show: true,
          color: '#fff',
          fontSize: 12
        }
      }
    },
    series: [{
      type: 'scatter',
      coordinateSystem: 'geo',
      data: data,
      symbolSize: (val: number[]) => Math.max(8, Math.min(20, val[2] * 5)),
      itemStyle: {
        color: {
          type: 'radial',
          x: 0.5,
          y: 0.5,
          r: 0.5,
          colorStops: [
            { offset: 0, color: '#ff6b6b' },
            { offset: 0.5, color: '#ff8787' },
            { offset: 1, color: 'rgba(255, 107, 107, 0.3)' }
          ]
        },
        shadowBlur: 10,
        shadowColor: 'rgba(255, 107, 107, 0.8)'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(255, 107, 107, 1)'
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    }]
  }

  heatmapChart.setOption(option)
}

// 更新区域分布图
function updateDistrictChart() {
  if (!districtChart) return

  const data = Object.entries(statistics.value.districtDistribution).map(([name, value]) => ({
    name,
    value
  }))

  // 如果没有数据，显示空状态
  if (data.length === 0) {
    districtChart.setOption({
      backgroundColor: 'transparent',
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: '🗺️',
                fontSize: 48,
                y: 0
              }
            },
            {
              type: 'text',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'bold',
                y: 60
              }
            },
            {
              type: 'text',
              style: {
                text: '请上传数据后查看区域分布统计',
                fontSize: 12,
                fill: 'rgba(255, 255, 255, 0.5)',
                y: 85
              }
            }
          ]
        }
      ]
    })
    return
  }

  // 渐变色配置
  const colors = [
    { start: '#4a90e2', end: '#50c9ff' },
    { start: '#667eea', end: '#764ba2' },
    { start: '#f093fb', end: '#f5576c' },
    { start: '#4facfe', end: '#00f2fe' },
    { start: '#43e97b', end: '#38f9d7' },
    { start: '#fa709a', end: '#fee140' }
  ]

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#4a90e2',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'center',
      height: '80%',
      textStyle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12
      },
      itemGap: 10,
      pageButtonItemGap: 5,
      pageButtonGap: 10,
      pageButtonPosition: 'end',
      pageFormatter: '{current}/{total}',
      pageIconColor: 'rgba(255, 255, 255, 0.8)',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.3)',
      pageIconSize: 12,
      pageTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10
      }
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 8,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 11,
        fontWeight: 'bold'
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 10,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      data: data.map((item, index) => ({
        ...item,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colors[index % colors.length].start },
              { offset: 1, color: colors[index % colors.length].end }
            ]
          }
        }
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'rgba(74, 144, 226, 0.8)'
        },
        label: {
          fontSize: 13,
          fontWeight: 'bold'
        }
      },
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 100
    }]
  }

  districtChart.setOption(option)
}

// 更新事件类型分布图
function updateEventTypeChart() {
  if (!eventTypeChart) return

  const data = Object.entries(statistics.value.eventTypeDistribution).map(([name, value]) => ({
    name,
    value
  }))

  // 如果没有数据，显示空状态
  if (data.length === 0) {
    eventTypeChart.setOption({
      backgroundColor: 'transparent',
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: '📊',
                fontSize: 48,
                y: 0
              }
            },
            {
              type: 'text',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'bold',
                y: 60
              }
            },
            {
              type: 'text',
              style: {
                text: '请上传数据后查看事件类型分布',
                fontSize: 12,
                fill: 'rgba(255, 255, 255, 0.5)',
                y: 85
              }
            }
          ]
        }
      ]
    })
    return
  }

  const colors = [
    { start: '#ff6b6b', end: '#ff8787' },
    { start: '#4ecdc4', end: '#44a08d' },
    { start: '#ffe66d', end: '#ffd93d' },
    { start: '#a8edea', end: '#fed6e3' },
    { start: '#ff9a9e', end: '#fecfef' },
    { start: '#ffecd2', end: '#fcb69f' }
  ]

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ff6b6b',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      type: 'scroll',
      bottom: 10,
      left: 'center',
      width: '80%',
      textStyle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11
      },
      itemGap: 15,
      pageButtonItemGap: 5,
      pageButtonGap: 10,
      pageButtonPosition: 'end',
      pageFormatter: '{current}/{total}',
      pageIconColor: 'rgba(255, 255, 255, 0.8)',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.3)',
      pageIconSize: 12,
      pageTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10
      }
    },
    series: [{
      type: 'pie',
      radius: ['30%', '65%'],
      center: ['50%', '45%'],
      roseType: 'area',
      itemStyle: {
        borderRadius: 6,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {c}',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 11
      },
      labelLine: {
        show: true,
        length: 12,
        length2: 8,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      data: data.map((item, index) => ({
        ...item,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: colors[index % colors.length].start },
              { offset: 1, color: colors[index % colors.length].end }
            ]
          }
        }
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'rgba(255, 107, 107, 0.8)'
        },
        scale: true,
        scaleSize: 10
      },
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 80
    }]
  }

  eventTypeChart.setOption(option)
}

// 更新传感器类型分布图
function updateSensorTypeChart() {
  if (!sensorTypeChart) return

  const data = Object.entries(statistics.value.sensorTypeDistribution).map(([name, value]) => ({
    name,
    value
  }))

  // 如果没有数据，显示空状态
  if (data.length === 0) {
    sensorTypeChart.setOption({
      backgroundColor: 'transparent',
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: '📡',
                fontSize: 48,
                y: 0
              }
            },
            {
              type: 'text',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'bold',
                y: 60
              }
            },
            {
              type: 'text',
              style: {
                text: '请上传数据后查看传感器类型分布',
                fontSize: 12,
                fill: 'rgba(255, 255, 255, 0.5)',
                y: 85
              }
            }
          ]
        }
      ]
    })
    return
  }

  const colors = [
    { start: '#667eea', end: '#764ba2' },
    { start: '#f093fb', end: '#f5576c' },
    { start: '#4facfe', end: '#00f2fe' },
    { start: '#43e97b', end: '#38f9d7' },
    { start: '#fa709a', end: '#fee140' },
    { start: '#30cfd0', end: '#330867' }
  ]

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#667eea',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      type: 'scroll',
      bottom: 10,
      left: 'center',
      width: '80%',
      textStyle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11
      },
      itemGap: 15,
      pageButtonItemGap: 5,
      pageButtonGap: 10,
      pageButtonPosition: 'end',
      pageFormatter: '{current}/{total}',
      pageIconColor: 'rgba(255, 255, 255, 0.8)',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.3)',
      pageIconSize: 12,
      pageTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10
      }
    },
    series: [{
      type: 'pie',
      radius: ['35%', '70%'],
      center: ['50%', '45%'],
      itemStyle: {
        borderRadius: 8,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 11,
        fontWeight: 'bold'
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 10,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      data: data.map((item, index) => ({
        ...item,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colors[index % colors.length].start },
              { offset: 1, color: colors[index % colors.length].end }
            ]
          }
        }
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'rgba(102, 126, 234, 0.8)'
        },
        scale: true,
        scaleSize: 10
      },
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 100
    }]
  }

  sensorTypeChart.setOption(option)
}

// 更新趋势图
function updateTrendChart() {
  if (!trendChart) return

  const data = statistics.value.timeSeriesData.map(item => item.value)
  const dates = statistics.value.timeSeriesData.map(item => item.time)
  const hasData = data.some(v => v > 0)

  // 如果所有数据都是0或没有数据，显示空状态
  if (!hasData || data.length === 0) {
    trendChart.setOption({
      backgroundColor: 'transparent',
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: '📈',
                fontSize: 48,
                y: 0
              }
            },
            {
              type: 'text',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'bold',
                y: 60
              }
            },
            {
              type: 'text',
              style: {
                text: '请上传数据后查看近7天问题趋势',
                fontSize: 12,
                fill: 'rgba(255, 255, 255, 0.5)',
                y: 85
              }
            }
          ]
        }
      ]
    })
    return
  }

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#4a90e2',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#4a90e2',
          width: 2,
          type: 'dashed'
        }
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 2
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 2
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)',
          type: 'dashed'
        }
      }
    },
    series: [{
      name: '事件数量',
      data: data,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: '#4a90e2' },
            { offset: 0.5, color: '#50c9ff' },
            { offset: 1, color: '#667eea' }
          ]
        }
      },
      itemStyle: {
        color: '#50c9ff',
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: 'rgba(74, 144, 226, 0.8)'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(74, 144, 226, 0.4)' },
            { offset: 0.5, color: 'rgba(80, 201, 255, 0.2)' },
            { offset: 1, color: 'rgba(74, 144, 226, 0.05)' }
          ]
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 15,
          shadowColor: 'rgba(74, 144, 226, 1)'
        },
        scale: true
      },
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut'
    }]
  }

  trendChart.setOption(option)
}

// 更新问题类型环形图（事件 vs 传感器异常分类对比）
function updateProblemTypeChart() {
  if (!problemTypeChart) return

  // 合并事件类型和传感器异常类型数据
  const eventTypeData = Object.entries(statistics.value.eventTypeDistribution).map(([name, value]) => ({
    name: `事件: ${name}`,
    value,
    category: 'event'
  }))

  // 只统计异常传感器
  const abnormalSensorTypeDistribution: Record<string, number> = {}
  dataStore.sensors
    .filter(s => s.status === '异常')
    .forEach(sensor => {
      abnormalSensorTypeDistribution[sensor.type] = (abnormalSensorTypeDistribution[sensor.type] || 0) + 1
    })

  const sensorTypeData = Object.entries(abnormalSensorTypeDistribution).map(([name, value]) => ({
    name: `传感器异常: ${name}`,
    value,
    category: 'sensor'
  }))

  // 合并数据
  const allData = [...eventTypeData, ...sensorTypeData]

  if (allData.length === 0) {
    // 如果没有数据，显示空状态
    problemTypeChart.setOption({
      backgroundColor: 'transparent',
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: '🔍',
                fontSize: 48,
                y: 0
              }
            },
            {
              type: 'text',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'bold',
                y: 60
              }
            },
            {
              type: 'text',
              style: {
                text: '请上传数据后查看问题类型环形图',
                fontSize: 12,
                fill: 'rgba(255, 255, 255, 0.5)',
                y: 85
              }
            }
          ]
        }
      ]
    })
    return
  }

  // 渐变色配置
  const eventColors = [
    { start: '#ff6b6b', end: '#ff8787' },
    { start: '#4ecdc4', end: '#44a08d' },
    { start: '#ffe66d', end: '#ffd93d' },
    { start: '#a8edea', end: '#fed6e3' },
    { start: '#ff9a9e', end: '#fecfef' }
  ]

  const sensorColors = [
    { start: '#667eea', end: '#764ba2' },
    { start: '#f093fb', end: '#f5576c' },
    { start: '#4facfe', end: '#00f2fe' },
    { start: '#43e97b', end: '#38f9d7' },
    { start: '#fa709a', end: '#fee140' }
  ]

  let eventColorIndex = 0
  let sensorColorIndex = 0

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#4a90e2',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 'center',
      height: '80%',
      textStyle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11
      },
      itemGap: 8,
      pageButtonItemGap: 5,
      pageButtonGap: 10,
      pageButtonPosition: 'end',
      pageFormatter: '{current}/{total}',
      pageIconColor: 'rgba(255, 255, 255, 0.8)',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.3)',
      pageIconSize: 12,
      pageTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10
      },
      formatter: (name: string) => {
        // 截断过长的名称
        return name.length > 12 ? name.substring(0, 12) + '...' : name
      }
    },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'], // 环形图：内半径50%，外半径75%
      center: ['40%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: (params: any) => {
          const name = params.name
          // 简化显示：只显示类型名称，不显示"事件:"或"传感器异常:"前缀
          if (name.startsWith('事件: ')) {
            return name.replace('事件: ', '')
          } else if (name.startsWith('传感器异常: ')) {
            return name.replace('传感器异常: ', '')
          }
          return name
        },
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 10,
        fontWeight: 'bold'
      },
      labelLine: {
        show: true,
        length: 12,
        length2: 8,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      data: allData.map((item) => {
        const isEvent = item.category === 'event'
        const colorPair = isEvent 
          ? eventColors[eventColorIndex++ % eventColors.length]
          : sensorColors[sensorColorIndex++ % sensorColors.length]
        
        return {
          ...item,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colorPair.start },
                { offset: 1, color: colorPair.end }
              ]
            }
          }
        }
      }),
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'rgba(74, 144, 226, 0.8)'
        },
        scale: true,
        scaleSize: 10
      },
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => idx * 80
    }]
  }

  problemTypeChart.setOption(option)
}

// 销毁图表
function destroyCharts() {
  heatmapChart?.dispose()
  districtChart?.dispose()
  eventTypeChart?.dispose()
  sensorTypeChart?.dispose()
  trendChart?.dispose()
  problemTypeChart?.dispose()
}

// 实时事件流
function startEventStream() {
  const sortedEvents = [...dataStore.events].sort((a, b) => 
    new Date(a.reportTime).getTime() - new Date(b.reportTime).getTime()
  )
  
  if (sortedEvents.length === 0) return

  isStreaming.value = true
  streamIndex.value = 0
  displayedEvents.value = []

  streamTimer = window.setInterval(() => {
    if (streamIndex.value < sortedEvents.length) {
      const event = { ...sortedEvents[streamIndex.value], isNew: true }
      displayedEvents.value.push(event)
      
      // 移除NEW标识
      setTimeout(() => {
        const index = displayedEvents.value.findIndex(e => e.id === event.id)
        if (index !== -1) {
          displayedEvents.value[index].isNew = false
        }
      }, 3000)

      streamIndex.value++
      scrollStreamToBottom()
    } else {
      stopEventStream()
    }
  }, 2000) // 每2秒一条
}

function stopEventStream() {
  if (streamTimer) {
    clearInterval(streamTimer)
    streamTimer = null
  }
  isStreaming.value = false
}

function toggleStream() {
  if (isStreaming.value) {
    stopEventStream()
  } else {
    startEventStream()
  }
}

function resetStream() {
  stopEventStream()
  displayedEvents.value = []
  streamIndex.value = 0
  startEventStream()
}

function scrollStreamToBottom() {
  nextTick(() => {
    if (streamContentRef.value) {
      streamContentRef.value.scrollTop = streamContentRef.value.scrollHeight
    }
  })
}

function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('HH:mm:ss')
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
  color: white;
  padding: 20px;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.dashboard-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4a90e2, #50c9ff, #667eea, #764ba2);
}

.dashboard-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(135deg, #4a90e2 0%, #50c9ff 50%, #667eea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
  text-shadow: 0 0 30px rgba(74, 144, 226, 0.5);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.nav-link {
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  border-radius: 5px;
  transition: all 0.3s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #4a90e2, #50c9ff);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(74, 144, 226, 0.4);
  border-color: rgba(74, 144, 226, 0.5);
  background: rgba(255, 255, 255, 0.12);
}

.metric-card:hover::before {
  opacity: 1;
}

.metric-icon {
  font-size: 32px;
}

.metric-info {
  flex: 1;
}

.metric-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 5px;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  background: linear-gradient(135deg, #4a90e2, #50c9ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
}

.metric-unit {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 4px;
  font-weight: normal;
}

.dashboard-content {
  width: 100%;
  box-sizing: border-box;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  width: 100%;
  box-sizing: border-box;
}

.left-panel,
.center-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4a90e2, #50c9ff, #667eea);
  opacity: 0.8;
}

.chart-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(74, 144, 226, 0.4);
  border-color: rgba(74, 144, 226, 0.5);
}

.chart-card h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-card h3::before {
  content: '';
  width: 4px;
  height: 16px;
  background: linear-gradient(180deg, #4a90e2, #50c9ff);
  border-radius: 2px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.event-stream {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.event-stream::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4a90e2, #50c9ff, #667eea);
  opacity: 0.8;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.stream-header h3 {
  margin: 0;
  font-size: 18px;
}

.stream-controls {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-play {
  background: #4a90e2;
  color: white;
}

.btn-pause {
  background: #ff6b6b;
  color: white;
}

.btn-reset {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.stream-content {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100px;
}

.stream-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.6;
}

.stream-empty p {
  margin: 5px 0;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px !important;
  color: rgba(255, 255, 255, 0.4) !important;
}

.stream-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 5px;
  transition: all 0.3s;
  position: relative;
}

.stream-item.new {
  background: rgba(74, 144, 226, 0.2);
  border-left: 3px solid #4a90e2;
}

.stream-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  min-width: 80px;
}

.stream-type {
  padding: 4px 8px;
  background: rgba(74, 144, 226, 0.3);
  border-radius: 3px;
  font-size: 12px;
  min-width: 100px;
}

.stream-location {
  flex: 1;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.stream-status {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.status-紧急,
.status-异常 {
  background: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
}

.status-未处理 {
  background: rgba(255, 193, 7, 0.3);
  color: #ffc107;
}

.new-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 2px 6px;
  background: #ff6b6b;
  color: white;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .dashboard-container {
    padding: 15px;
  }
  
  .main-content {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .right-panel {
    grid-column: 1 / -1;
  }
  
  .chart-container {
    height: 250px;
  }
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .metrics-row {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .chart-container {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 10px;
  }
  
  .dashboard-header {
    padding: 10px 15px;
  flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .dashboard-header h1 {
    font-size: 18px;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .nav-link {
    font-size: 12px;
    padding: 6px 12px;
  }
  
  .main-content {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .metrics-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .metric-card {
    padding: 15px;
  }
  
  .metric-icon {
    font-size: 24px;
  }
  
  .metric-value {
    font-size: 24px;
  }
  
  .chart-card {
    padding: 15px;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .event-stream {
    padding: 15px;
  }
  
  .stream-content {
    max-height: 150px;
  }
}

@media (max-width: 480px) {
  .metrics-row {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 200px;
  }
  
  .stream-content {
    max-height: 120px;
  }
}
</style>
