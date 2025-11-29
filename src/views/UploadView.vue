<template>
  <div class="upload-container">
    <AppHeader />

    <div class="content">
      <div
        class="upload-area" 
        :class="{ 'drag-over': isDragOver }"
        @drop="handleDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @click="triggerFileInput"
      >
        <input 
          ref="fileInputRef"
          type="file" 
          accept=".json"
          style="display: none"
          @change="handleFileSelect"
        >
        <div class="upload-icon">
          📁
        </div>
        <p class="upload-text">
          拖拽 JSON 文件到此处或点击上传
        </p>
        <p class="upload-hint">
          支持 .json 文件格式
        </p>
      </div>

      <div
        v-if="uploadedFiles.length > 0"
        class="uploaded-files"
      >
        <h3>已上传文件</h3>
        <div class="file-list">
          <div
            v-for="file in uploadedFiles"
            :key="file.name"
            class="file-item"
          >
            <span class="file-name">{{ file.name }}</span>
            <span
              class="file-status"
              :class="file.status"
            >
              {{ file.status === 'success' ? '✓ 成功' : '✗ 失败' }}
            </span>
            <span class="file-count">{{ file.count }} 条数据</span>
          </div>
        </div>
        <div class="actions">
          <el-button
            type="danger"
            @click="clearData"
          >
            清空数据
          </el-button>
          <el-button
            type="primary"
            @click="goToDashboard"
          >
            查看大屏
          </el-button>
        </div>
      </div>

      <div
        v-if="statistics.totalEvents > 0 || statistics.totalSensors > 0"
        class="statistics"
      >
        <h3>数据统计概览</h3>
        <div class="stats-sections">
          <!-- 事件数据概览 -->
          <div class="stats-section">
            <h4 class="section-title">
              事件数据
            </h4>
            <div class="stat-card stat-card-main">
              <div class="stat-label">
                事件总数
              </div>
              <div class="stat-value">
                {{ statistics.totalEvents }}
              </div>
            </div>

            <!-- 类型分布：整体容器样式与事件总数一致，内部为小卡片 -->
            <div class="stat-card stat-card-group">
              <div class="stat-label">
                类型分布
              </div>
              <div
                v-if="eventTypeList.length > 0"
                class="stat-chip-list"
              >
                <div
                  v-for="item in eventTypeList"
                  :key="item.type"
                  class="stat-chip"
                >
                  <span class="stat-chip-label">{{ item.type }}</span>
                  <span class="stat-chip-value">{{ item.count }}</span>
                </div>
              </div>
              <p
                v-else
                class="stat-empty"
              >
                暂无事件类型数据
              </p>
            </div>

            <!-- 区域分布：整体容器样式与事件总数一致，内部为小卡片 -->
            <div class="stat-card stat-card-group">
              <div class="stat-label">
                区域分布
              </div>
              <div
                v-if="districtList.length > 0"
                class="stat-chip-list"
              >
                <div
                  v-for="item in districtList"
                  :key="item.district"
                  class="stat-chip"
                >
                  <span class="stat-chip-label">{{ item.district }}</span>
                  <span class="stat-chip-value">{{ item.count }}</span>
                </div>
              </div>
              <p
                v-else
                class="stat-empty"
              >
                暂无区域分布数据
              </p>
            </div>
          </div>

          <!-- 传感器数据概览 -->
          <div class="stats-section">
            <h4 class="section-title">
              传感器数据
            </h4>
            <div class="stat-card stat-card-main">
              <div class="stat-label">
                传感器异常数量
              </div>
              <div class="stat-value">
                {{ statistics.abnormalSensors }}
              </div>
            </div>
            <div class="stat-card stat-card-main">
              <div class="stat-label">
                设备在线率
              </div>
              <div class="stat-value">
                {{ sensorOnlineRate }}<span class="stat-unit">%</span>
              </div>
              <div class="stat-extra">
                共 {{ statistics.totalSensors }} 台设备
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!--
  数据上传页面组件
  功能：
  - 支持拖拽和点击上传JSON文件
  - 数据格式验证
  - 数据统计展示
  - 数据持久化
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import AppHeader from '@/components/AppHeader.vue'
import { useDataStore } from '@/stores/dataStore'
import { validateJSONFile } from '@/utils/validation'
import type { CityEvent, SensorData } from '@/types'

// ========== 路由和状态管理 ==========
const router = useRouter()
const dataStore = useDataStore()

// ========== 响应式状态 ==========
/** 文件输入元素的引用 */
const fileInputRef = ref<HTMLInputElement | null>(null)
/** 是否处于拖拽悬停状态 */
const isDragOver = ref(false)
/** 已上传文件列表 */
const uploadedFiles = ref<Array<{
  name: string
  status: 'success' | 'error'
  count: number
  errors?: string[]
}>>([])

// ========== 计算属性 ==========
/** 统计数据（从store获取） */
const statistics = computed(() => dataStore.statistics)

/** 事件类型分布列表 */
const eventTypeList = computed(() =>
  Object.entries(statistics.value.eventTypeDistribution).map(([type, count]) => ({
    type,
    count
  }))
)

/** 区域分布列表 */
const districtList = computed(() =>
  Object.entries(statistics.value.districtDistribution).map(([district, count]) => ({
    district,
    count
  }))
)

/** 设备在线率（百分比） */
const sensorOnlineRate = computed(() => {
  const total = dataStore.sensors.length
  if (!total) return 0

  const online = dataStore.sensors.filter(sensor => sensor.status === '正常').length
  return Math.round((online / total) * 100)
})

// ========== 方法 ==========
/**
 * 触发文件选择对话框
 * 当用户点击上传区域时调用
 */
function triggerFileInput() {
  fileInputRef.value?.click()
}

/**
 * 处理文件选择事件
 * 当用户通过文件选择对话框选择文件时触发
 * 
 * @param event 文件输入事件
 */
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await processFile(file)
    target.value = '' // 重置input，允许重复选择同一文件
  }
}

/**
 * 处理文件拖拽放置事件
 * 当用户将文件拖拽到上传区域并释放时触发
 * 
 * @param event 拖拽事件
 */
async function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  const file = event.dataTransfer?.files[0]
  // 只处理JSON文件
  if (file && file.name.endsWith('.json')) {
    await processFile(file)
  }
}

/**
 * 处理文件上传和解析
 * 读取文件内容，验证格式，解析数据并存储到store
 * 
 * @param file 要处理的文件对象
 */
async function processFile(file: File) {
  try {
    const text = await file.text()
    
    // 验证JSON格式
    const validation = validateJSONFile(text)
    
    if (!validation.valid) {
      uploadedFiles.value.push({
        name: file.name,
        status: 'error',
        count: 0,
        errors: validation.errors
      })
      await ElMessageBox.alert(
        validation.errors.join('\n'),
        '文件验证失败',
        { type: 'error' }
      )
      return
    }

    const data = JSON.parse(text)
    
    // 判断数据类型并存储
    const firstItem = data[0]
    const isEvent = 'id' in firstItem && 'reportTime' in firstItem
    
    if (isEvent) {
      dataStore.setEvents(data as CityEvent[])
      uploadedFiles.value.push({
        name: file.name,
        status: 'success',
        count: data.length
      })
    } else {
      dataStore.setSensors(data as SensorData[])
      uploadedFiles.value.push({
        name: file.name,
        status: 'success',
        count: data.length
      })
    }

    // 数据上传成功后，启动预警检查
    const { useWarnStore } = await import('@/stores/warnStore')
    const warnStore = useWarnStore()
    // 如果启用了自动检查，则启动
    if (warnStore.config.autoCheck) {
      warnStore.startAutoCheck()
    } else {
      // 即使没有启用自动检查，也至少检查一次
      warnStore.checkWarnings()
    }

    // 数据上传成功后，自动生成当日简报（延迟执行，等待预警检查完成）
    setTimeout(() => {
      // 触发简报生成事件（通过事件总线或直接调用）
      window.dispatchEvent(new CustomEvent('generate-daily-report'))
    }, 2000) // 延迟2秒，等待预警检查完成

    ElMessage.success(`文件上传成功，共 ${data.length} 条数据`)
  } catch (error) {
    uploadedFiles.value.push({
      name: file.name,
      status: 'error',
      count: 0,
      errors: [error instanceof Error ? error.message : '未知错误']
    })
    ElMessage.error(`文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 清空所有数据
 * 清除store中的数据和已上传文件记录
 */
async function clearData() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有已上传的数据吗？此操作不可恢复。',
      '确认清空数据',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    dataStore.clearData()
    uploadedFiles.value = []
    ElMessage.success('数据已清空')
  } catch {
    // 用户取消，无需处理
  }
}

/**
 * 跳转到大屏展示页面
 */
function goToDashboard() {
  router.push('/dashboard')
}
</script>

<style scoped>
.upload-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  width: 100%;
  overflow-x: hidden;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .upload-container {
    padding: 15px;
  }
  
  .upload-area {
    padding: 40px 20px;
  }
  
  .upload-icon {
    font-size: 48px;
  }
  
  .upload-text {
    font-size: 16px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .content {
    padding: 0 5px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .upload-area {
    padding: 30px 15px;
  }
}

.upload-area {
  background: white;
  border: 3px dashed #667eea;
  border-radius: 10px;
  padding: 60px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
}

.upload-area:hover {
  border-color: #764ba2;
  background: #f8f9ff;
}

.upload-area.drag-over {
  border-color: #764ba2;
  background: #f0f4ff;
  transform: scale(1.02);
}

.upload-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.upload-text {
  font-size: 18px;
  color: #333;
  margin-bottom: 10px;
}

.upload-hint {
  font-size: 14px;
  color: #999;
}

.uploaded-files {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.uploaded-files h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.file-list {
  margin-bottom: 20px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
  margin-bottom: 10px;
}

.file-name {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.file-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.file-status.success {
  background: #d4edda;
  color: #155724;
}

.file-status.error {
  background: #f8d7da;
  color: #721c24;
}

.file-count {
  color: #666;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.statistics {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.statistics h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.stats-sections {
  display: grid;
  grid-template-columns: 2fr 1.3fr;
  gap: 20px;
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 16px 18px;
  border-radius: 8px;
  color: white;
}

.stat-card-main + .stat-card-main {
  margin-top: 10px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
}

.stat-unit {
  font-size: 16px;
  margin-left: 4px;
}

.stat-extra {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.stat-empty {
  margin: 0;
  font-size: 13px;
  color: #999;
}

/* 小卡片容器（类型分布 / 区域分布内部） */
.stat-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.stat-chip {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 13px;
  min-width: 120px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.stat-chip-label {
  flex: 1;
  margin-right: 8px;
}

.stat-chip-value {
  min-width: 32px;
  text-align: right;
  font-weight: 600;
}

@media (max-width: 768px) {
  .stats-sections {
    grid-template-columns: 1fr;
  }
}
</style>

