<!--
  预警侧边栏通知组件
  功能：
  - 从右侧滑入显示预警通知
  - 支持多个通知堆叠显示
  - 点击通知可跳转到预警详情
  - 支持关闭通知
-->
<template>
  <div
    v-if="notifications.length > 0"
    class="notification-container"
  >
    <TransitionGroup
      name="slide"
      tag="div"
      class="notification-list"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification-item', `level-${notification.level}`]"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-header">
          <div class="notification-icon">
            <span v-if="notification.level === 'high'">🔴</span>
            <span v-else-if="notification.level === 'medium'">🟡</span>
            <span v-else>🔵</span>
          </div>
          <div class="notification-content">
            <div class="notification-title">
              {{ notification.title }}
            </div>
            <div class="notification-time">
              {{ formatTime(notification.timestamp) }}
            </div>
          </div>
          <button
            class="notification-close"
            title="关闭"
            @click.stop="closeNotification(notification.id)"
          >
            ×
          </button>
        </div>
        <div class="notification-body">
          <p class="notification-description">
            {{ notification.description }}
          </p>
          <div class="notification-location">
            📍 {{ notification.location.district }} {{ notification.location.street }}
          </div>
        </div>
        <div class="notification-footer">
          <span class="notification-type">{{ getTypeLabel(notification.type) }}</span>
          <span class="notification-level">{{ getLevelLabel(notification.level) }}</span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWarnStore } from '@/stores/warnStore'
import dayjs from 'dayjs'

const router = useRouter()
const warnStore = useWarnStore()

// 自动关闭定时器管理（存储每个通知的定时器ID）
const autoCloseTimers = ref<Map<string, number>>(new Map())

// 自动关闭延迟时间（毫秒）
const AUTO_CLOSE_DELAY = 2000 // 2秒

// 获取待显示的预警通知（只显示待处理状态的预警）
const notifications = computed(() => {
  return warnStore.pendingWarnings
    .filter(w => !warnStore.isNotificationClosed(w.id))
    .sort((a, b) => {
      // 按优先级排序：高 > 中 > 低
      const levelOrder = { high: 3, medium: 2, low: 1 }
      const levelDiff = levelOrder[b.level] - levelOrder[a.level]
      if (levelDiff !== 0) return levelDiff
      // 同优先级按时间倒序（最新的在前）
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    .slice(0, 5) // 最多显示5个通知
})

/**
 * 为通知设置自动关闭定时器
 * @param notificationId 通知ID
 */
function setupAutoClose(notificationId: string) {
  // 如果已经存在定时器，先清除
  clearAutoCloseTimer(notificationId)
  
  // 设置新的定时器
  const timerId = window.setTimeout(() => {
    warnStore.closeNotification(notificationId)
    autoCloseTimers.value.delete(notificationId)
  }, AUTO_CLOSE_DELAY)
  
  autoCloseTimers.value.set(notificationId, timerId)
}

/**
 * 清除指定通知的自动关闭定时器
 * @param notificationId 通知ID
 */
function clearAutoCloseTimer(notificationId: string) {
  const timerId = autoCloseTimers.value.get(notificationId)
  if (timerId) {
    clearTimeout(timerId)
    autoCloseTimers.value.delete(notificationId)
  }
}

/**
 * 清除所有自动关闭定时器
 */
function clearAllAutoCloseTimers() {
  autoCloseTimers.value.forEach(timerId => {
    clearTimeout(timerId)
  })
  autoCloseTimers.value.clear()
}

// 监听通知列表变化，为新通知设置自动关闭
watch(
  notifications,
  (newNotifications, oldNotifications) => {
    // 找出新增的通知
    const oldIds = new Set((oldNotifications || []).map(n => n.id))
    const newIds = new Set(newNotifications.map(n => n.id))
    
    // 为新通知设置自动关闭
    newNotifications.forEach(notification => {
      if (!oldIds.has(notification.id)) {
        // 这是一个新通知，设置自动关闭
        setupAutoClose(notification.id)
      }
    })
    
    // 清除已消失通知的定时器
    oldIds.forEach(id => {
      if (!newIds.has(id)) {
        clearAutoCloseTimer(id)
      }
    })
  },
  { immediate: true }
)

/**
 * 格式化时间
 */
function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('HH:mm:ss')
}

/**
 * 获取预警类型标签
 */
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    event: '事件预警',
    sensor: '传感器预警',
    correlation: '关联预警'
  }
  return labels[type] || type
}

/**
 * 获取预警级别标签
 */
function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return labels[level] || level
}

/**
 * 处理通知点击
 * 跳转到预警管理页面
 */
function handleNotificationClick(notification: any) {
  // 清除自动关闭定时器
  clearAutoCloseTimer(notification.id)
  // 关闭通知
  warnStore.closeNotification(notification.id)
  // 跳转到预警页面
  router.push('/warnings')
}

/**
 * 关闭通知
 */
function closeNotification(id: string) {
  // 清除自动关闭定时器
  clearAutoCloseTimer(id)
  // 关闭通知
  warnStore.closeNotification(id)
}

// 组件卸载时清除所有定时器
onUnmounted(() => {
  clearAllAutoCloseTimers()
})
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  pointer-events: none;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  pointer-events: auto;
  border-left: 4px solid #ddd;
  min-width: 320px;
  max-width: 400px;
}

.notification-item:hover {
  transform: translateX(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.notification-item.level-high {
  border-left-color: #dc3545;
  background: linear-gradient(to right, #fff5f5, white);
}

.notification-item.level-medium {
  border-left-color: #ffc107;
  background: linear-gradient(to right, #fffbf0, white);
}

.notification-item.level-low {
  border-left-color: #17a2b8;
  background: linear-gradient(to right, #f0f9fa, white);
}

.notification-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.notification-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 15px;
  color: #333;
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.notification-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.notification-close:hover {
  color: #dc3545;
  transform: scale(1.2);
}

.notification-body {
  margin-bottom: 12px;
}

.notification-description {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-location {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

.notification-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.notification-type {
  font-size: 12px;
  padding: 4px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
}

.notification-level {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.notification-item.level-high .notification-level {
  background: #f8d7da;
  color: #721c24;
}

.notification-item.level-medium .notification-level {
  background: #fff3cd;
  color: #856404;
}

.notification-item.level-low .notification-level {
  background: #d1ecf1;
  color: #0c5460;
}

/* 滑入动画 */
.slide-enter-active {
  transition: all 0.3s ease-out;
}

.slide-leave-active {
  transition: all 0.3s ease-in;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-move {
  transition: transform 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-container {
    right: 10px;
    top: 10px;
    max-width: calc(100vw - 20px);
  }

  .notification-item {
    min-width: auto;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .notification-container {
    right: 5px;
    top: 5px;
    max-width: calc(100vw - 10px);
  }

  .notification-item {
    padding: 12px;
  }

  .notification-title {
    font-size: 14px;
  }

  .notification-description {
    font-size: 12px;
  }
}
</style>

