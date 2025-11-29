/**
 * 数据存储 Store
 * 管理城市事件和传感器数据，提供数据统计和持久化功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CityEvent, SensorData, Statistics, TimeSeriesPoint } from '@/types'
import dayjs from 'dayjs'

/**
 * 数据存储 Store
 * 使用 Pinia 的 Composition API 风格
 */
export const useDataStore = defineStore('data', () => {
  // ========== 状态定义 ==========
  
  /** 城市事件数据列表 */
  const events = ref<CityEvent[]>([])
  
  /** 传感器数据列表 */
  const sensors = ref<SensorData[]>([])

  // ========== 计算属性 ==========
  
  /**
   * 统计数据
   * 实时计算事件和传感器的各种统计指标
   */
  const statistics = computed<Statistics>(() => {
    // 事件类型分布统计
    const eventTypeDistribution: Record<string, number> = {}
    events.value.forEach(event => {
      eventTypeDistribution[event.type] = (eventTypeDistribution[event.type] || 0) + 1
    })

    // 传感器类型分布统计
    const sensorTypeDistribution: Record<string, number> = {}
    sensors.value.forEach(sensor => {
      sensorTypeDistribution[sensor.type] = (sensorTypeDistribution[sensor.type] || 0) + 1
    })

    // 区域分布统计（合并事件和传感器）
    const districtDistribution: Record<string, number> = {}
    events.value.forEach(event => {
      const district = event.location.district
      districtDistribution[district] = (districtDistribution[district] || 0) + 1
    })
    sensors.value.forEach(sensor => {
      const district = sensor.location.district
      districtDistribution[district] = (districtDistribution[district] || 0) + 1
    })

    // 异常设备数量统计
    const abnormalSensors = sensors.value.filter(s => s.status === '异常').length

    // 时间序列数据（近7天的事件数量统计）
    // 基于数据中的实际日期范围，找出最近7天
    const timeSeriesData: TimeSeriesPoint[] = []
    
    if (events.value.length === 0) {
      // 如果没有数据，返回最近7天的空数据
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        return dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD')
      })
      last7Days.forEach(date => {
        timeSeriesData.push({
          time: date,
          value: 0
        })
      })
    } else {
      // 找出数据中的最新日期（最晚的reportTime）
      const eventTimestamps = events.value.map(e => dayjs(e.reportTime).valueOf())
      const latestTimestamp = Math.max(...eventTimestamps)
      const latestDate = dayjs(latestTimestamp)
      
      // 基于最新日期往前推7天
      const dateRange = Array.from({ length: 7 }, (_, i) => {
        return latestDate.subtract(6 - i, 'day').format('YYYY-MM-DD')
      })
      
      // 统计每天的事件数量
      dateRange.forEach(date => {
        const dayEvents = events.value.filter(e => {
          const eventDate = dayjs(e.reportTime).format('YYYY-MM-DD')
          return eventDate === date
        })
        timeSeriesData.push({
          time: date,
          value: dayEvents.length
        })
      })
    }

    return {
      totalEvents: events.value.length,
      totalSensors: sensors.value.length,
      abnormalSensors,
      eventTypeDistribution,
      sensorTypeDistribution,
      districtDistribution,
      timeSeriesData
    }
  })

  /**
   * 高优先级问题数量
   * 统计状态为"紧急"的事件数量
   */
  const highPriorityCount = computed(() => {
    return events.value.filter(e => e.status === '紧急').length
  })

  /**
   * 今日事件数量
   * 统计今天上报的事件数量
   */
  const todayEventCount = computed(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return events.value.filter(e => {
      return dayjs(e.reportTime).format('YYYY-MM-DD') === today
    }).length
  })

  // ========== 方法定义 ==========
  
  /**
   * 设置事件数据（替换全部）
   * @param newEvents 新的事件数据数组
   */
  function setEvents(newEvents: CityEvent[]) {
    events.value = newEvents
    saveToLocalStorage()
  }

  /**
   * 设置传感器数据（替换全部）
   * @param newSensors 新的传感器数据数组
   */
  function setSensors(newSensors: SensorData[]) {
    sensors.value = newSensors
    saveToLocalStorage()
  }

  /**
   * 添加事件数据（追加）
   * @param newEvents 要添加的事件数据数组
   */
  function addEvents(newEvents: CityEvent[]) {
    events.value.push(...newEvents)
    saveToLocalStorage()
  }

  /**
   * 添加传感器数据（追加）
   * @param newSensors 要添加的传感器数据数组
   */
  function addSensors(newSensors: SensorData[]) {
    sensors.value.push(...newSensors)
    saveToLocalStorage()
  }

  /**
   * 清空所有数据
   * 清除内存和本地存储中的数据
   */
  function clearData() {
    events.value = []
    sensors.value = []
    localStorage.removeItem('city-sense-events')
    localStorage.removeItem('city-sense-sensors')
  }

  /**
   * 从本地存储加载数据
   * 在应用启动时恢复之前保存的数据
   */
  function loadFromLocalStorage() {
    try {
      const savedEvents = localStorage.getItem('city-sense-events')
      const savedSensors = localStorage.getItem('city-sense-sensors')
      
      if (savedEvents) {
        events.value = JSON.parse(savedEvents)
      }
      if (savedSensors) {
        sensors.value = JSON.parse(savedSensors)
      }
    } catch (error) {
      console.error('加载本地存储数据失败:', error)
    }
  }

  /**
   * 保存数据到本地存储
   * 将当前数据持久化到浏览器本地存储
   */
  function saveToLocalStorage() {
    try {
      localStorage.setItem('city-sense-events', JSON.stringify(events.value))
      localStorage.setItem('city-sense-sensors', JSON.stringify(sensors.value))
    } catch (error) {
      console.error('保存到本地存储失败:', error)
    }
  }

  // ========== 初始化 ==========
  
  // 应用启动时自动加载本地存储的数据
  loadFromLocalStorage()

  return {
    events,
    sensors,
    statistics,
    highPriorityCount,
    todayEventCount,
    setEvents,
    setSensors,
    addEvents,
    addSensors,
    clearData,
    loadFromLocalStorage,
    saveToLocalStorage
  }
})

