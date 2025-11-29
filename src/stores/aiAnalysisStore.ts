/**
 * AI分析历史记录 Store
 * 管理AI分析的历史记录，提供保存、查询、删除等功能
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AIAnalysisResult } from '@/types'

/**
 * AI分析历史记录 Store
 */
export const useAIAnalysisStore = defineStore('aiAnalysis', () => {
  // ========== 状态定义 ==========
  
  /** AI分析历史记录列表 */
  const history = ref<AIAnalysisResult[]>([])

  // ========== 方法定义 ==========
  
  /**
   * 添加AI分析记录
   * @param result AI分析结果
   */
  function addRecord(result: AIAnalysisResult) {
    history.value.unshift(result) // 新记录添加到最前面
    saveToLocalStorage()
  }

  /**
   * 删除AI分析记录
   * @param id 记录ID
   */
  function deleteRecord(id: string) {
    const index = history.value.findIndex(r => r.id === id)
    if (index !== -1) {
      history.value.splice(index, 1)
      saveToLocalStorage()
    }
  }

  /**
   * 清空所有历史记录
   */
  function clearHistory() {
    history.value = []
    localStorage.removeItem('city-sense-ai-analysis-history')
  }

  /**
   * 从本地存储加载历史记录
   */
  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('city-sense-ai-analysis-history')
      if (saved) {
        history.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载AI分析历史记录失败:', error)
    }
  }

  /**
   * 保存历史记录到本地存储
   */
  function saveToLocalStorage() {
    try {
      // 只保存最近100条记录
      const toSave = history.value.slice(0, 100)
      localStorage.setItem('city-sense-ai-analysis-history', JSON.stringify(toSave))
    } catch (error) {
      console.error('保存AI分析历史记录失败:', error)
    }
  }

  // ========== 初始化 ==========
  
  // 应用启动时自动加载历史记录
  loadFromLocalStorage()

  return {
    history,
    addRecord,
    deleteRecord,
    clearHistory,
    loadFromLocalStorage,
    saveToLocalStorage
  }
})

