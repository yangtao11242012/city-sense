/**
 * 预警规则工具
 * 实现各种智能预警规则，用于自动检测城市运行中的异常情况
 */

import type { CityEvent, SensorData, Warning } from '@/types'
import dayjs from 'dayjs'

/**
 * 预警规则1：事件聚集检测
 * 检测同一区域在指定时间窗口内同类事件是否超过阈值
 * 
 * @param events 事件数据列表
 * @param timeWindowHours 时间窗口（小时），默认1小时
 * @param threshold 事件数量阈值，默认5次
 * @returns 生成的预警列表
 * 
 * @example
 * // 检测1小时内同一区域同类事件是否≥5次
 * const warnings = checkEventClusterRule(events, 1, 5)
 */
export function checkEventClusterRule(
  events: CityEvent[],
  timeWindowHours: number = 1,
  threshold: number = 5
): Warning[] {
  const warnings: Warning[] = []

  // 按区域和类型分组
  const groups = new Map<string, CityEvent[]>()

  events.forEach(event => {
    const key = `${event.location.district}_${event.type}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(event)
  })

  // 检查每个分组
  groups.forEach((groupEvents, key) => {
    // 按时间排序
    const sortedEvents = groupEvents.sort((a, b) =>
      dayjs(a.reportTime).valueOf() - dayjs(b.reportTime).valueOf()
    )

    // 滑动窗口检查
    for (let i = 0; i < sortedEvents.length; i++) {
      const windowStart = dayjs(sortedEvents[i].reportTime)
      const windowEnd = windowStart.add(timeWindowHours, 'hour')
      
      const eventsInWindow = sortedEvents.filter(e => {
        const eventTime = dayjs(e.reportTime)
        return eventTime.isAfter(windowStart) && eventTime.isBefore(windowEnd)
      })

      if (eventsInWindow.length >= threshold) {
        const [district, type] = key.split('_')
        const warning: Warning = {
          id: `warning_event_${Date.now()}_${i}`,
          type: 'event',
          level: eventsInWindow.length >= 10 ? 'high' : 'medium',
          title: `${district}${type}集中爆发`,
          description: `${windowStart.format('YYYY-MM-DD HH:mm')}至${windowEnd.format('HH:mm')}期间，${district}发生${eventsInWindow.length}起${type}事件，超过阈值${threshold}次`,
          location: sortedEvents[i].location,
          relatedEvents: eventsInWindow.map(e => e.id),
          timestamp: new Date().toISOString(),
          status: 'pending'
        }
        warnings.push(warning)
        break // 每个分组只生成一个预警
      }
    }
  })

  return warnings
}

/**
 * 预警规则2：传感器连续异常检测
 * 检测传感器是否连续多次超过阈值，避免偶发异常误报
 * 
 * @param sensors 传感器数据列表
 * @param consecutiveCount 连续异常次数阈值，默认3次
 * @returns 生成的预警列表
 * 
 * @example
 * // 检测传感器是否连续3次超阈值
 * const warnings = checkSensorThresholdRule(sensors, 3)
 */
export function checkSensorThresholdRule(
  sensors: SensorData[],
  consecutiveCount: number = 3
): Warning[] {
  const warnings: Warning[] = []

  // 按传感器ID分组
  const groups = new Map<string, SensorData[]>()

  sensors.forEach(sensor => {
    if (!groups.has(sensor.sensorId)) {
      groups.set(sensor.sensorId, [])
    }
    groups.get(sensor.sensorId)!.push(sensor)
  })

  // 检查每个传感器
  groups.forEach((sensorData, sensorId) => {
    // 只检查异常状态的传感器
    const abnormalData = sensorData
      .filter(s => s.status === '异常')
      .sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf())

    if (abnormalData.length >= consecutiveCount) {
      // 检查是否连续
      let consecutive = 1
      let maxConsecutive = 1
      let startIndex = 0

      for (let i = 1; i < abnormalData.length; i++) {
        const prevTime = dayjs(abnormalData[i - 1].timestamp)
        const currTime = dayjs(abnormalData[i].timestamp)
        const timeDiff = currTime.diff(prevTime, 'hour')

        // 如果时间间隔小于2小时，认为是连续的
        if (timeDiff < 2) {
          consecutive++
          maxConsecutive = Math.max(maxConsecutive, consecutive)
        } else {
          consecutive = 1
          startIndex = i
        }
      }

      if (maxConsecutive >= consecutiveCount) {
        const sensor = abnormalData[startIndex]
        const warning: Warning = {
          id: `warning_sensor_${Date.now()}_${sensorId}`,
          type: 'sensor',
          level: sensor.value > sensor.threshold * 1.5 ? 'high' : 'medium',
          title: `${sensor.type}持续异常`,
          description: `传感器${sensorId}连续${maxConsecutive}次超过阈值，当前值：${sensor.value}${sensor.unit}，阈值：${sensor.threshold}${sensor.unit}`,
          location: sensor.location,
          relatedSensors: [sensor.sensorId],
          timestamp: new Date().toISOString(),
          status: 'pending'
        }
        warnings.push(warning)
      }
    }
  })

  return warnings
}

/**
 * 预警规则3：数据关联分析
 * 检测同一位置是否同时发生事件和传感器异常，可能存在关联问题
 * 
 * @param events 事件数据列表
 * @param sensors 传感器数据列表
 * @returns 生成的预警列表
 * 
 * @example
 * // 检测同一位置的事件和传感器异常关联
 * const warnings = checkCorrelationRule(events, sensors)
 */
export function checkCorrelationRule(
  events: CityEvent[],
  sensors: SensorData[]
): Warning[] {
  const warnings: Warning[] = []

  // 按位置分组（使用经纬度，误差在0.01度内认为是同一位置）
  const locationGroups = new Map<string, {
    events: CityEvent[]
    sensors: SensorData[]
  }>()

  // 分组事件
  events.forEach(event => {
    const key = `${Math.round(event.location.lat * 100)}_${Math.round(event.location.lng * 100)}`
    if (!locationGroups.has(key)) {
      locationGroups.set(key, { events: [], sensors: [] })
    }
    locationGroups.get(key)!.events.push(event)
  })

  // 分组传感器
  sensors.forEach(sensor => {
    if (sensor.status === '异常') {
      const key = `${Math.round(sensor.location.lat * 100)}_${Math.round(sensor.location.lng * 100)}`
      if (!locationGroups.has(key)) {
        locationGroups.set(key, { events: [], sensors: [] })
      }
      locationGroups.get(key)!.sensors.push(sensor)
    }
  })

  // 检查同时有事件和异常传感器的位置
  locationGroups.forEach((group, key) => {
    if (group.events.length > 0 && group.sensors.length > 0) {
      // 检查时间是否相近（24小时内）
      const recentEvents = group.events.filter(e => {
        const eventTime = dayjs(e.reportTime)
        return dayjs().diff(eventTime, 'hour') < 24
      })

      if (recentEvents.length > 0) {
        const event = recentEvents[0]
        const sensor = group.sensors[0]
        
        const warning: Warning = {
          id: `warning_correlation_${Date.now()}_${key}`,
          type: 'correlation',
          level: 'high',
          title: `${event.location.district}${event.location.street}异常集中`,
          description: `该位置同时发生${event.type}事件和${sensor.type}传感器异常，可能存在关联问题`,
          location: event.location,
          relatedEvents: group.events.map(e => e.id),
          relatedSensors: group.sensors.map(s => s.sensorId),
          timestamp: new Date().toISOString(),
          status: 'pending'
        }
        warnings.push(warning)
      }
    }
  })

  return warnings
}

/**
 * 检查所有预警规则
 * 综合执行所有预警规则，返回所有检测到的预警
 * 
 * @param events 事件数据列表
 * @param sensors 传感器数据列表
 * @param options 预警规则配置选项
 * @param options.eventClusterThreshold 事件聚集阈值
 * @param options.eventClusterTimeWindow 事件聚集时间窗口（小时）
 * @param options.sensorConsecutiveCount 传感器连续异常次数
 * @returns 所有预警的合并列表
 */
export function checkAllWarnings(
  events: CityEvent[],
  sensors: SensorData[],
  options?: {
    eventClusterThreshold?: number
    eventClusterTimeWindow?: number
    sensorConsecutiveCount?: number
  }
): Warning[] {
  const warnings: Warning[] = []

  // 规则1：事件聚集
  const eventWarnings = checkEventClusterRule(
    events,
    options?.eventClusterTimeWindow,
    options?.eventClusterThreshold
  )
  warnings.push(...eventWarnings)

  // 规则2：传感器连续异常
  const sensorWarnings = checkSensorThresholdRule(
    sensors,
    options?.sensorConsecutiveCount
  )
  warnings.push(...sensorWarnings)

  // 规则3：关联分析
  const correlationWarnings = checkCorrelationRule(events, sensors)
  warnings.push(...correlationWarnings)

  return warnings
}

/**
 * 预警去重
 * 基于位置、类型和标题去除重复的预警
 * 
 * @param warnings 预警列表
 * @returns 去重后的预警列表
 */
export function deduplicateWarnings(warnings: Warning[]): Warning[] {
  const seen = new Set<string>()
  const unique: Warning[] = []

  warnings.forEach(warning => {
    const key = `${warning.location.district}_${warning.location.street}_${warning.type}_${warning.title}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(warning)
    }
  })

  return unique
}

