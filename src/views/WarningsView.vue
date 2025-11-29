<template>
  <div class="warnings-container">
    <AppHeader />

    <div class="warnings-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button
            type="primary"
            @click="manualCheck"
          >
            手动检查预警
          </el-button>
          <el-button @click="showConfig = true">
            预警配置
          </el-button>
          <el-button @click="exportWarnings">
            导出预警
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 150px;"
          >
            <el-option
              label="全部状态"
              value=""
            />
            <el-option
              label="待处理"
              value="pending"
            />
            <el-option
              label="处理中"
              value="processing"
            />
            <el-option
              label="已解决"
              value="resolved"
            />
          </el-select>
          <el-select
            v-model="filterLevel"
            placeholder="全部级别"
            clearable
            style="width: 150px;"
          >
            <el-option
              label="全部级别"
              value=""
            />
            <el-option
              label="高"
              value="high"
            />
            <el-option
              label="中"
              value="medium"
            />
            <el-option
              label="低"
              value="low"
            />
          </el-select>
        </div>
      </div>

      <!-- 预警统计 -->
      <div class="stats-cards">
        <div class="stat-card stat-pending">
          <div class="stat-value">
            {{ filteredWarnings.filter(w => w.status === 'pending').length }}
          </div>
          <div class="stat-label">
            待处理
          </div>
        </div>
        <div class="stat-card stat-processing">
          <div class="stat-value">
            {{ filteredWarnings.filter(w => w.status === 'processing').length }}
          </div>
          <div class="stat-label">
            处理中
          </div>
        </div>
        <div class="stat-card stat-resolved">
          <div class="stat-value">
            {{ filteredWarnings.filter(w => w.status === 'resolved').length }}
          </div>
          <div class="stat-label">
            已解决
          </div>
        </div>
        <div class="stat-card stat-high">
          <div class="stat-value">
            {{ filteredWarnings.filter(w => w.level === 'high').length }}
          </div>
          <div class="stat-label">
            高优先级
          </div>
        </div>
      </div>

      <!-- 预警列表 -->
      <div class="warnings-list">
        <div
          v-if="filteredWarnings.length === 0"
          class="empty-state"
        >
          <p>暂无预警信息</p>
        </div>
        <div v-else>
          <div 
            v-for="warning in filteredWarnings" 
            :key="warning.id"
            :class="['warning-item', `level-${warning.level}`, `status-${warning.status}`]"
          >
            <div class="warning-header">
              <div class="warning-title-row">
                <h3 class="warning-title">
                  {{ warning.title }}
                </h3>
                <span
                  class="warning-level"
                  :class="`level-${warning.level}`"
                >
                  {{ getLevelText(warning.level) }}
                </span>
                <span class="warning-type">{{ getTypeText(warning.type) }}</span>
              </div>
              <div class="warning-actions">
                <el-button 
                  v-if="warning.status === 'pending'"
                  type="primary"
                  size="small"
                  @click="updateStatus(warning.id, 'processing')"
                >
                  开始处理
                </el-button>
                <el-button 
                  v-if="warning.status === 'processing'"
                  type="success"
                  size="small"
                  @click="updateStatus(warning.id, 'resolved')"
                >
                  标记已解决
                </el-button>
                <el-button 
                  type="info"
                  size="small"
                  @click="viewAIAnalysis(warning)"
                >
                  AI分析
                </el-button>
                <el-button 
                  type="danger"
                  size="small"
                  @click="deleteWarning(warning.id)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <div class="warning-content">
              <p class="warning-description">
                {{ warning.description }}
              </p>
              <div class="warning-meta">
                <span class="warning-location">
                  📍 {{ warning.location.district }} {{ warning.location.street }}
                </span>
                <span class="warning-time">
                  🕐 {{ formatTime(warning.timestamp) }}
                </span>
              </div>
              <div
                v-if="warning.aiSuggestion"
                class="ai-suggestion"
              >
                <strong>AI建议：</strong>{{ warning.aiSuggestion }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 配置弹窗 -->
      <el-dialog
        v-model="showConfig"
        title="预警配置"
        width="500px"
      >
        <el-form
          :model="localConfig"
          label-width="160px"
        >
          <el-form-item label="事件聚集阈值">
            <el-input-number 
              v-model="localConfig.eventClusterThreshold" 
              :min="1"
              style="width: 100%;"
            />
            <div class="form-hint">
              同一区域1小时内同类事件达到此数量时触发预警
            </div>
          </el-form-item>
          <el-form-item label="时间窗口（小时）">
            <el-input-number 
              v-model="localConfig.eventClusterTimeWindow" 
              :min="0.5"
              :step="0.5"
              style="width: 100%;"
            />
          </el-form-item>
          <el-form-item label="传感器连续异常次数">
            <el-input-number 
              v-model="localConfig.sensorConsecutiveCount" 
              :min="1"
              style="width: 100%;"
            />
          </el-form-item>
          <el-form-item label="自动检查预警">
            <el-switch v-model="localConfig.autoCheck" />
          </el-form-item>
          <el-form-item label="检查间隔（秒）">
            <el-input-number 
              v-model="checkIntervalSeconds" 
              :min="10"
              style="width: 100%;"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showConfig = false">
            取消
          </el-button>
          <el-button
            type="primary"
            @click="saveConfig"
          >
            保存
          </el-button>
        </template>
      </el-dialog>

      <!-- AI分析弹窗 -->
      <el-dialog
        v-model="showAIAnalysis"
        title="AI分析结果"
        width="800px"
      >
        <div
          v-if="aiAnalysisLoading"
          class="loading"
        >
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>分析中...</span>
        </div>
        <div
          v-else-if="aiAnalysisResult"
          class="ai-analysis-result"
        >
          <div class="result-section">
            <h4>问题归因</h4>
            <p>{{ aiAnalysisResult.analysis.cause }}</p>
          </div>
          <div class="result-section">
            <h4>处置建议</h4>
            <p>{{ aiAnalysisResult.analysis.suggestion }}</p>
          </div>
        </div>
        <template #footer>
          <el-button @click="showAIAnalysis = false">
            关闭
          </el-button>
          <el-button 
            v-if="aiAnalysisResult"
            type="primary"
            @click="applyAISuggestion"
          >
            应用建议到预警
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import AppHeader from '@/components/AppHeader.vue'
import { useWarnStore } from '@/stores/warnStore'
import { analyzeData } from '@/services/ai'
import type { Warning, AIAnalysisResult } from '@/types'
import dayjs from 'dayjs'

const warnStore = useWarnStore()

// 筛选
const filterStatus = ref('')
const filterLevel = ref('')

// 配置
const showConfig = ref(false)
const localConfig = ref({ ...warnStore.config })
const checkIntervalSeconds = ref(warnStore.config.checkInterval / 1000)

// AI分析
const showAIAnalysis = ref(false)
const currentWarning = ref<Warning | null>(null)
const aiAnalysisLoading = ref(false)
const aiAnalysisResult = ref<AIAnalysisResult | null>(null)

// 计算属性
const filteredWarnings = computed(() => {
  let result = warnStore.warnings

  if (filterStatus.value) {
    result = result.filter(w => w.status === filterStatus.value)
  }

  if (filterLevel.value) {
    result = result.filter(w => w.level === filterLevel.value)
  }

  return result.sort((a, b) => {
    // 按优先级和时间排序
    const levelOrder = { high: 3, medium: 2, low: 1 }
    const levelDiff = levelOrder[b.level] - levelOrder[a.level]
    if (levelDiff !== 0) return levelDiff
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
})

// 方法
function manualCheck() {
  warnStore.checkWarnings()
  ElMessage.success('预警检查完成')
}

function updateStatus(id: string, status: Warning['status']) {
  warnStore.updateWarningStatus(id, status)
}

async function deleteWarning(id: string) {
  try {
    await ElMessageBox.confirm(
      '确定要删除此预警吗？删除后将无法恢复。',
      '确认删除预警',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
    warnStore.deleteWarning(id)
    ElMessage.success('预警已删除')
  } catch {
    // 用户取消，无需处理
  }
}

function saveConfig() {
  warnStore.updateConfig({
    ...localConfig.value,
    checkInterval: checkIntervalSeconds.value * 1000
  })
  showConfig.value = false
  ElMessage.success('配置已保存')
}

async function viewAIAnalysis(warning: Warning) {
  currentWarning.value = warning
  showAIAnalysis.value = true
  aiAnalysisLoading.value = true
  aiAnalysisResult.value = null

  try {
    const { useDataStore } = await import('@/stores/dataStore')
    const dataStore = useDataStore()
    
    const relatedEvents = warning.relatedEvents 
      ? dataStore.events.filter(e => warning.relatedEvents!.includes(e.id))
      : []
    const relatedSensors = warning.relatedSensors
      ? dataStore.sensors.filter(s => warning.relatedSensors!.includes(s.sensorId))
      : []

    const result = await analyzeData(
      relatedEvents.length > 0 ? relatedEvents : undefined,
      relatedSensors.length > 0 ? relatedSensors : undefined
    )
    
    aiAnalysisResult.value = result
  } catch (error: any) {
    ElMessage.error(`AI分析失败: ${error.message}`)
  } finally {
    aiAnalysisLoading.value = false
  }
}

function applyAISuggestion() {
  if (currentWarning.value && aiAnalysisResult.value) {
    const suggestion = `${aiAnalysisResult.value.analysis.cause}\n\n${aiAnalysisResult.value.analysis.suggestion}`
    warnStore.addAISuggestion(currentWarning.value.id, suggestion)
    showAIAnalysis.value = false
    ElMessage.success('AI建议已应用到预警')
  }
}

function exportWarnings() {
  const data = filteredWarnings.value
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `warnings-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function getLevelText(level: string): string {
  const map: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[level] || level
}

function getTypeText(type: string): string {
  const map: Record<string, string> = {
    event: '事件预警',
    sensor: '传感器预警',
    correlation: '关联预警'
  }
  return map[type] || type
}

function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  // 初始化时检查一次
  warnStore.checkWarnings()
})
</script>

<style scoped>
.warnings-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 100%;
  overflow-x: hidden;
  padding: 20px;
  box-sizing: border-box;
}

.warnings-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 10px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.btn {
  padding: 8px 16px;
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

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-pending .stat-value {
  color: #ffc107;
}

.stat-processing .stat-value {
  color: #17a2b8;
}

.stat-resolved .stat-value {
  color: #28a745;
}

.stat-high .stat-value {
  color: #dc3545;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.warnings-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.warning-item {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #ddd;
}

.warning-item.level-high {
  border-left-color: #dc3545;
}

.warning-item.level-medium {
  border-left-color: #ffc107;
}

.warning-item.level-low {
  border-left-color: #17a2b8;
}

.warning-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.warning-title {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.warning-level {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.warning-level.level-high {
  background: #f8d7da;
  color: #721c24;
}

.warning-level.level-medium {
  background: #fff3cd;
  color: #856404;
}

.warning-level.level-low {
  background: #d1ecf1;
  color: #0c5460;
}

.warning-type {
  padding: 4px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 12px;
}

.warning-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.warning-content {
  color: #666;
}

.warning-description {
  margin: 0 0 10px 0;
  line-height: 1.6;
}

.warning-meta {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #999;
  margin-bottom: 10px;
}

.ai-suggestion {
  margin-top: 10px;
  padding: 10px;
  background: #e3f2fd;
  border-radius: 5px;
  font-size: 14px;
  line-height: 1.6;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 800px;
}

.config-form {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #333;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-hint {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #999;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.ai-analysis-result {
  margin-top: 20px;
}

.result-section {
  margin-bottom: 20px;
}

.result-section h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.result-section p {
  margin: 0;
  line-height: 1.6;
  color: #666;
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .warnings-container {
    padding: 0;
  }
  
  .warnings-content {
    padding: 15px 10px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .toolbar-left,
  .toolbar-right {
    flex-direction: column;
    width: 100%;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .warning-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .warning-title-row {
    width: 100%;
  }
  
  .warning-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .warning-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .modal-content {
    width: 95%;
    padding: 20px;
    max-height: 90vh;
  }
}

@media (max-width: 480px) {
  .warnings-content {
    padding: 10px 5px;
  }
  
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .warning-title {
    font-size: 16px;
  }
  
  .warning-actions {
    flex-direction: column;
  }
  
  .btn-sm {
    width: 100%;
  }
}
</style>
