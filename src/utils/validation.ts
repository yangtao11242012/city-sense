/**
 * 数据验证工具
 * 提供数据格式验证、范围检查等功能
 */

import type { ValidationResult, Location } from '@/types'

/**
 * 北京地区经纬度范围常量
 * 用于验证数据是否在合理的北京地区范围内
 */
const BEIJING_BOUNDS = {
  lat: { min: 39.4, max: 40.6 },  // 纬度范围
  lng: { min: 115.7, max: 117.4 } // 经度范围
}

/**
 * 验证经纬度是否在北京地区范围内
 * @param location 位置信息对象
 * @returns 如果经纬度在范围内返回 true，否则返回 false
 */
export function validateLocation(location: Location): boolean {
  const { lat, lng } = location
  return (
    lat >= BEIJING_BOUNDS.lat.min &&
    lat <= BEIJING_BOUNDS.lat.max &&
    lng >= BEIJING_BOUNDS.lng.min &&
    lng <= BEIJING_BOUNDS.lng.max
  )
}

/**
 * 验证时间戳是否为有效的 ISO 8601 格式
 * @param timestamp 时间戳字符串
 * @returns 如果格式有效返回 true，否则返回 false
 * @example "2025-11-12T08:30:00" -> true
 */
export function validateTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp)
  // 检查日期是否有效且包含 'T' 分隔符（ISO 8601 格式特征）
  return !isNaN(date.getTime()) && timestamp.includes('T')
}

/**
 * 验证城市事件数据的完整性和正确性
 * @param data 待验证的事件数据对象
 * @returns 验证结果，包含是否有效和错误信息列表
 */
export function validateCityEvent(data: any): ValidationResult {
  const errors: string[] = []

  // ========== 必填字段检查 ==========
  if (!data.id) errors.push('缺少事件ID')
  if (!data.type) errors.push('缺少事件类型')
  if (!data.description) errors.push('缺少事件描述')
  if (!data.location) errors.push('缺少位置信息')
  if (!data.reportTime) errors.push('缺少上报时间')
  if (!data.reporterType) errors.push('缺少上报来源')
  if (!data.status) errors.push('缺少状态')

  // ========== 位置信息验证 ==========
  if (data.location) {
    if (!data.location.district) errors.push('缺少区县信息')
    if (!data.location.street) errors.push('缺少街道信息')
    // 验证经纬度类型和范围
    if (typeof data.location.lat !== 'number' || typeof data.location.lng !== 'number') {
      errors.push('经纬度必须是数字')
    } else if (!validateLocation(data.location)) {
      errors.push(`经纬度超出北京地区范围 (${data.location.lat}, ${data.location.lng})`)
    }
  }

  // ========== 时间格式验证 ==========
  if (data.reportTime && !validateTimestamp(data.reportTime)) {
    errors.push('上报时间格式不正确，应为ISO 8601格式')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证传感器数据的完整性和正确性
 * @param data 待验证的传感器数据对象
 * @returns 验证结果，包含是否有效和错误信息列表
 */
export function validateSensorData(data: any): ValidationResult {
  const errors: string[] = []

  // ========== 必填字段检查 ==========
  if (!data.sensorId) errors.push('缺少传感器ID')
  if (!data.type) errors.push('缺少传感器类型')
  if (!data.location) errors.push('缺少位置信息')
  if (typeof data.value !== 'number') errors.push('传感器数值必须是数字')
  if (!data.unit) errors.push('缺少单位')
  if (typeof data.threshold !== 'number') errors.push('阈值必须是数字')
  if (!data.timestamp) errors.push('缺少时间戳')
  if (!data.status) errors.push('缺少状态')

  // ========== 位置信息验证 ==========
  if (data.location) {
    if (!data.location.district) errors.push('缺少区县信息')
    if (!data.location.street) errors.push('缺少街道信息')
    // 验证经纬度类型和范围
    if (typeof data.location.lat !== 'number' || typeof data.location.lng !== 'number') {
      errors.push('经纬度必须是数字')
    } else if (!validateLocation(data.location)) {
      errors.push(`经纬度超出北京地区范围 (${data.location.lat}, ${data.location.lng})`)
    }
  }

  // ========== 时间格式验证 ==========
  if (data.timestamp && !validateTimestamp(data.timestamp)) {
    errors.push('时间戳格式不正确，应为ISO 8601格式')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证JSON文件内容的完整性和格式
 * 自动识别数据类型（事件或传感器）并验证所有数据项
 * @param content JSON文件内容字符串
 * @returns 验证结果，包含是否有效和所有错误信息
 */
export function validateJSONFile(content: string): ValidationResult {
  const errors: string[] = []

  try {
    // 解析JSON字符串
    const data = JSON.parse(content)

    // ========== 基础格式检查 ==========
    // 检查是否为数组格式
    if (!Array.isArray(data)) {
      errors.push('JSON文件内容必须是数组')
      return { valid: false, errors }
    }

    // 检查数组是否为空
    if (data.length === 0) {
      errors.push('JSON文件内容不能为空')
      return { valid: false, errors }
    }

    // ========== 数据类型识别 ==========
    // 通过第一个元素的字段判断数据类型
    const firstItem = data[0]
    const isEvent = 'id' in firstItem && 'reportTime' in firstItem  // 事件数据特征
    const isSensor = 'sensorId' in firstItem && 'timestamp' in firstItem // 传感器数据特征

    if (!isEvent && !isSensor) {
      errors.push('无法识别数据类型，应为城市事件或传感器数据')
      return { valid: false, errors }
    }

    // ========== 逐项验证 ==========
    // 遍历数组，验证每个数据项
    data.forEach((item, index) => {
      const result = isEvent ? validateCityEvent(item) : validateSensorData(item)
      if (!result.valid) {
        errors.push(`第${index + 1}项数据验证失败: ${result.errors.join(', ')}`)
      }
    })
  } catch (error) {
    // JSON解析失败的情况
    errors.push(`JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

