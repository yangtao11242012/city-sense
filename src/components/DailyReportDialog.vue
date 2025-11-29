<!--
  城市运行简报对话框组件
  功能：
  - 显示AI生成的当日城市运行简报
  - 支持导出为PDF
  - 包含：问题汇总、热点区域、处置建议、预警回顾
-->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="城市运行简报"
    width="900px"
    :close-on-click-modal="false"
    class="report-dialog"
  >
    <div
      v-if="loading"
      class="loading-container"
    >
      <el-icon
        class="is-loading"
        :size="40"
      >
        <Loading />
      </el-icon>
      <p>正在生成简报，请稍候...</p>
    </div>
    <div
      v-else-if="report"
      ref="reportContentRef"
      class="report-container"
    >
      <div class="report-header">
        <h2 class="report-title">
          城市运行简报
        </h2>
        <div class="report-date">
          {{ formatDate(report.date) }}
        </div>
      </div>

      <div class="report-content">
        <div class="report-section">
          <h3 class="section-title">
            <span class="section-icon">📊</span>
            问题汇总
          </h3>
          <div class="section-content">
            {{ report.problemSummary }}
          </div>
        </div>

        <div class="report-section">
          <h3 class="section-title">
            <span class="section-icon">📍</span>
            热点区域
          </h3>
          <div class="section-content">
            {{ report.hotspotAreas }}
          </div>
        </div>

        <div class="report-section">
          <h3 class="section-title">
            <span class="section-icon">💡</span>
            处置建议
          </h3>
          <div class="section-content">
            {{ report.suggestions }}
          </div>
        </div>

        <div class="report-section">
          <h3 class="section-title">
            <span class="section-icon">⚠️</span>
            预警回顾
          </h3>
          <div class="section-content">
            {{ report.warningReview }}
          </div>
        </div>
      </div>

      <div class="report-footer">
        <div class="report-meta">
          生成时间：{{ formatTime(report.generatedAt) }}
        </div>
      </div>
    </div>
    <div
      v-else
      class="empty-state"
    >
      <p>暂无简报数据</p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">
          关闭
        </el-button>
        <el-button
          type="primary"
          :disabled="!report || loading"
          :loading="exporting"
          @click="exportToPDF"
        >
          <el-icon><Download /></el-icon>
          导出PDF
        </el-button>
        <el-button
          v-if="report"
          :loading="loading"
          @click="regenerateReport"
        >
          重新生成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Download } from '@element-plus/icons-vue'
import { generateDailyReport } from '@/services/report'
import { useDataStore } from '@/stores/dataStore'
import { useWarnStore } from '@/stores/warnStore'
import type { DailyReport } from '@/services/report'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dataStore = useDataStore()
const warnStore = useWarnStore()

const dialogVisible = ref(props.modelValue)
const loading = ref(false)
const exporting = ref(false)
const report = ref<DailyReport | null>(null)
const reportContentRef = ref<HTMLElement | null>(null)

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
  if (newVal && !report.value) {
    // 打开对话框时自动生成简报
    generateReport()
  }
})

// 监听 dialogVisible 变化
watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 监听数据变化，自动更新简报
watch([() => dataStore.events, () => dataStore.sensors, () => warnStore.warnings], () => {
  // 如果对话框已打开且有报告，重新生成
  if (dialogVisible.value && report.value) {
    generateReport()
  }
}, { deep: true })

// 监听简报生成事件
function handleGenerateReport() {
  if (dataStore.events.length > 0 || dataStore.sensors.length > 0) {
    generateReport()
  }
}

onMounted(() => {
  window.addEventListener('generate-daily-report', handleGenerateReport)
})

onUnmounted(() => {
  window.removeEventListener('generate-daily-report', handleGenerateReport)
})

/**
 * 生成简报
 */
async function generateReport() {
  if (dataStore.events.length === 0 && dataStore.sensors.length === 0) {
    ElMessage.warning('暂无数据，无法生成简报')
    return
  }

  loading.value = true
  report.value = null

  try {
    const warnings = warnStore.warnings.map(w => ({
      title: w.title,
      description: w.description,
      level: w.level,
      location: w.location
    }))

    const generatedReport = await generateDailyReport(
      dataStore.events,
      dataStore.sensors,
      warnings
    )

    report.value = generatedReport
    ElMessage.success('简报生成成功')
  } catch (error: any) {
    console.error('生成简报失败:', error)
    ElMessage.error(`生成简报失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

/**
 * 重新生成简报
 */
function regenerateReport() {
  generateReport()
}

/**
 * 导出为PDF
 */
async function exportToPDF() {
  if (!report.value || !reportContentRef.value) {
    ElMessage.warning('没有可导出的内容')
    return
  }

  exporting.value = true

  try {
    // 使用html2canvas将内容转换为canvas
    const canvas = await html2canvas(reportContentRef.value, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // 创建PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
    const imgScaledWidth = imgWidth * ratio
    const imgScaledHeight = imgHeight * ratio
    
    // 如果内容超过一页，需要分页
    const pageHeight = pdfHeight
    let heightLeft = imgScaledHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgScaledHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight)
      heightLeft -= pageHeight
    }

    // 保存PDF
    const fileName = `城市运行简报_${report.value.date}.pdf`
    pdf.save(fileName)
    
    ElMessage.success('PDF导出成功')
  } catch (error: any) {
    console.error('导出PDF失败:', error)
    ElMessage.error(`导出PDF失败: ${error.message || '未知错误'}`)
  } finally {
    exporting.value = false
  }
}

/**
 * 格式化日期
 */
function formatDate(date: string): string {
  return dayjs(date).format('YYYY年MM月DD日')
}

/**
 * 格式化时间
 */
function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.report-dialog :deep(.el-dialog__body) {
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.loading-container p {
  margin-top: 16px;
  font-size: 14px;
}

.report-container {
  padding: 30px;
  background: white;
  min-height: 500px;
}

.report-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.report-title {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: bold;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.report-date {
  font-size: 16px;
  color: #666;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.report-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #667eea;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 20px;
}

.section-content {
  font-size: 14px;
  line-height: 1.8;
  color: #555;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.report-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  text-align: right;
}

.report-meta {
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .report-container {
    padding: 20px;
  }

  .report-title {
    font-size: 24px;
  }

  .section-title {
    font-size: 16px;
  }

  .section-content {
    font-size: 13px;
  }
}
</style>

