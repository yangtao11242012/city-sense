/**
 * 预警管理 Store
 * 管理预警规则检查、预警状态、预警历史等功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDataStore } from './dataStore'
import { checkAllWarnings, deduplicateWarnings } from '@/utils/warnRule'
import type { Warning } from '@/types'

/**
 * 预警管理 Store
 * 使用 Pinia 的 Composition API 风格
 */
export const useWarnStore = defineStore('warning', () => {
  const dataStore = useDataStore()

  // ========== 状态定义 ==========
  
  /** 当前预警列表 */
  const warnings = ref<Warning[]>([])
  
  /** 预警历史记录（所有预警，包括已解决的） */
  const history = ref<Warning[]>([])
  
  /** 已关闭的通知ID列表 */
  const closedNotifications = ref<Set<string>>(new Set())
  
  /** 预警规则配置 */
  const config = ref({
    eventClusterThreshold: 5,        // 事件聚集阈值（默认5次）
    eventClusterTimeWindow: 1,       // 事件聚集时间窗口（小时，默认1小时）
    sensorConsecutiveCount: 3,       // 传感器连续异常次数（默认3次）
    autoCheck: true,                 // 是否自动检查预警
    checkInterval: 60000            // 自动检查间隔（毫秒，默认60秒）
  })

  /** 自动检查定时器ID */
  let checkTimer: number | null = null

  // ========== 计算属性 ==========
  
  /** 待处理的预警列表 */
  const pendingWarnings = computed(() => 
    warnings.value.filter(w => w.status === 'pending')
  )

  /** 处理中的预警列表 */
  const processingWarnings = computed(() => 
    warnings.value.filter(w => w.status === 'processing')
  )

  /** 已解决的预警列表 */
  const resolvedWarnings = computed(() => 
    warnings.value.filter(w => w.status === 'resolved')
  )

  /** 高优先级预警列表 */
  const highLevelWarnings = computed(() => 
    warnings.value.filter(w => w.level === 'high')
  )

  // ========== 方法定义 ==========
  
  /**
   * 检查预警
   * 执行所有预警规则，生成新预警并去重
   * 如果没有数据，则不执行检查
   */
  function checkWarnings() {
    // 如果没有数据，不执行检查
    if (dataStore.events.length === 0 && dataStore.sensors.length === 0) {
      return
    }

    const newWarnings = checkAllWarnings(
      dataStore.events,
      dataStore.sensors,
      {
        eventClusterThreshold: config.value.eventClusterThreshold,
        eventClusterTimeWindow: config.value.eventClusterTimeWindow,
        sensorConsecutiveCount: config.value.sensorConsecutiveCount
      }
    )

    // 去重
    const uniqueWarnings = deduplicateWarnings(newWarnings)

    // 检查是否已存在（基于ID）
    uniqueWarnings.forEach(newWarning => {
      const exists = warnings.value.some(w => 
        w.id === newWarning.id || 
        (w.location.district === newWarning.location.district &&
         w.location.street === newWarning.location.street &&
         w.type === newWarning.type &&
         w.title === newWarning.title)
      )
      
      if (!exists) {
        warnings.value.push(newWarning)
        history.value.push(newWarning)
        
        // 注意：不再使用浏览器原生通知，改为使用 Element Plus 风格的侧边栏通知组件
        // 侧边栏通知由 WarningNotification.vue 组件自动显示
      }
    })

    // 清理已关闭的通知记录（移除不存在的预警对应的记录）
    clearClosedNotifications()
    saveToLocalStorage()
  }

  /**
   * 更新预警状态
   * @param id 预警ID
   * @param status 新状态（pending/processing/resolved）
   */
  function updateWarningStatus(id: string, status: Warning['status']) {
    const warning = warnings.value.find(w => w.id === id)
    if (warning) {
      warning.status = status
      saveToLocalStorage()
    }
  }

  /**
   * 添加AI处置建议到预警
   * @param id 预警ID
   * @param suggestion AI生成的建议内容
   */
  function addAISuggestion(id: string, suggestion: string) {
    const warning = warnings.value.find(w => w.id === id)
    if (warning) {
      warning.aiSuggestion = suggestion
      saveToLocalStorage()
    }
  }

  /**
   * 删除预警
   * @param id 预警ID
   */
  function deleteWarning(id: string) {
    warnings.value = warnings.value.filter(w => w.id !== id)
    saveToLocalStorage()
  }

  /**
   * 清空所有预警
   * 包括预警列表、历史记录和已关闭的通知记录
   */
  function clearWarnings() {
    warnings.value = []
    history.value = []
    closedNotifications.value.clear()
    stopAutoCheck() // 停止自动检查
    saveToLocalStorage()
  }

  /**
   * 更新预警配置
   * @param newConfig 新的配置对象（部分更新）
   */
  function updateConfig(newConfig: Partial<typeof config.value>) {
    config.value = { ...config.value, ...newConfig }
    saveToLocalStorage()
    
    // 重启自动检查
    if (config.value.autoCheck) {
      startAutoCheck()
    } else {
      stopAutoCheck()
    }
  }

  /**
   * 启动自动检查
   * 按照配置的间隔自动执行预警检查
   */
  function startAutoCheck() {
    stopAutoCheck()
    if (config.value.autoCheck) {
      checkWarnings() // 立即检查一次
      checkTimer = window.setInterval(() => {
        checkWarnings()
      }, config.value.checkInterval)
    }
  }

  /**
   * 停止自动检查
   */
  function stopAutoCheck() {
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
  }

  // ========== 数据持久化 ==========
  
  /**
   * 从本地存储加载预警数据
   * 在应用启动时恢复之前保存的预警和配置
   */
  function loadFromLocalStorage() {
    try {
      const savedWarnings = localStorage.getItem('city-sense-warnings')
      const savedHistory = localStorage.getItem('city-sense-warning-history')
      const savedConfig = localStorage.getItem('city-sense-warning-config')
      const savedClosedNotifications = localStorage.getItem('city-sense-closed-notifications')

      if (savedWarnings) {
        warnings.value = JSON.parse(savedWarnings)
      }
      if (savedHistory) {
        history.value = JSON.parse(savedHistory)
      }
      if (savedConfig) {
        config.value = { ...config.value, ...JSON.parse(savedConfig) }
      }
      if (savedClosedNotifications) {
        closedNotifications.value = new Set(JSON.parse(savedClosedNotifications))
      }
    } catch (error) {
      console.error('加载预警数据失败:', error)
    }
  }

  /**
   * 保存预警数据到本地存储
   * 将当前预警列表、历史和配置持久化
   */
  function saveToLocalStorage() {
    try {
      localStorage.setItem('city-sense-warnings', JSON.stringify(warnings.value))
      localStorage.setItem('city-sense-warning-history', JSON.stringify(history.value))
      localStorage.setItem('city-sense-warning-config', JSON.stringify(config.value))
      localStorage.setItem('city-sense-closed-notifications', JSON.stringify(Array.from(closedNotifications.value)))
    } catch (error) {
      console.error('保存预警数据失败:', error)
    }
  }

  /**
   * 检查通知是否已关闭
   * 注意：这里的"通知"指的是侧边栏通知组件（WarningNotification.vue），不是浏览器原生通知
   * @param id 预警ID
   * @returns 是否已关闭
   */
  function isNotificationClosed(id: string): boolean {
    return closedNotifications.value.has(id)
  }

  /**
   * 关闭通知
   * @param id 预警ID
   */
  function closeNotification(id: string) {
    closedNotifications.value.add(id)
    saveToLocalStorage()
  }

  /**
   * 清除已关闭的通知记录
   * 用于清理不再存在的预警对应的通知记录
   */
  function clearClosedNotifications() {
    const existingIds = new Set(warnings.value.map(w => w.id))
    closedNotifications.value = new Set(
      Array.from(closedNotifications.value).filter(id => existingIds.has(id))
    )
    saveToLocalStorage()
  }

  // ========== 初始化 ==========
  
  // 应用启动时自动加载本地存储的数据
  loadFromLocalStorage()
  // 注意：不再请求浏览器原生通知权限，改为使用 Element Plus 风格的侧边栏通知组件
  // 注意：不在初始化时自动启动检查，等上传数据后再启动
  // 如果启用了自动检查，会在数据上传后自动启动

  return {
    warnings,
    history,
    config,
    pendingWarnings,
    processingWarnings,
    resolvedWarnings,
    highLevelWarnings,
    checkWarnings,
    updateWarningStatus,
    addAISuggestion,
    deleteWarning,
    clearWarnings,
    updateConfig,
    startAutoCheck,
    stopAutoCheck,
    loadFromLocalStorage,
    saveToLocalStorage,
    isNotificationClosed,
    closeNotification,
    clearClosedNotifications
  }
})

