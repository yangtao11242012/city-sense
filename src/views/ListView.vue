<template>
  <div class="list-container">
    <AppHeader />

    <div class="list-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="view-switch">
          <el-button 
            v-for="view in views" 
            :key="view.value"
            :type="currentView === view.value ? 'primary' : 'default'"
            @click="currentView = view.value"
          >
            {{ view.label }}
          </el-button>
        </div>

        <div class="toolbar-right">
          <el-input 
            v-model="searchText" 
            placeholder="搜索..." 
            clearable
            style="width: 200px;"
          />
          <el-button 
            @click="showHistoryDialog = true"
          >
            历史分析记录
          </el-button>
          <el-button 
            type="warning"
            @click="handlePatternAnalysis"
          >
            全局模式分析
          </el-button>
          <el-button 
            :disabled="selectedItems.length === 0" 
            type="primary"
            @click="handleAIAnalysis"
          >
            AI分析 ({{ selectedItems.length }})
          </el-button>
          <el-button
            type="primary"
            @click="exportData"
          >
            导出数据
          </el-button>
        </div>
      </div>

      <!-- 筛选器 -->
      <div class="filters">
        <el-date-picker
          v-model="filterDateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          clearable
        />

        <el-select
          v-model="filterDistrict"
          placeholder="全部区域"
          clearable
          style="width: 150px;"
        >
          <el-option
            label="全部区域"
            value=""
          />
          <el-option 
            v-for="district in districts" 
            :key="district" 
            :label="district" 
            :value="district"
          />
        </el-select>

        <el-select
          v-model="filterType"
          placeholder="全部类型"
          clearable
          style="width: 150px;"
        >
          <el-option
            label="全部类型"
            value=""
          />
          <el-option 
            v-for="type in types" 
            :key="type" 
            :label="type" 
            :value="type"
          />
        </el-select>

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
            label="未处理"
            value="未处理"
          />
          <el-option
            label="已派单"
            value="已派单"
          />
          <el-option
            label="处理中"
            value="处理中"
          />
          <el-option
            label="紧急"
            value="紧急"
          />
          <el-option
            label="异常"
            value="异常"
          />
        </el-select>

        <el-button @click="clearFilters">
          清除筛选
        </el-button>
      </div>

      <!-- 数据统计和操作栏 -->
      <div class="stats-bar">
        <div class="stats-left">
          <span>共 {{ filteredData.length }} 条数据</span>
          <span v-if="filteredData.length < totalData">（已筛选 {{ totalData }} 条中的 {{ filteredData.length }} 条）</span>
          <span
            v-if="selectedItems.length > 0"
            class="selected-count"
          >
            已选择 {{ selectedItems.length }} 条
          </span>
        </div>
        <div class="stats-right">
          <el-button 
            v-if="paginatedData.length > 0" 
            text
            type="primary"
            @click="toggleSelectAll"
          >
            {{ allSelected ? '取消全选' : '全选当前页' }}
          </el-button>
          <el-button 
            v-if="selectedItems.length > 0" 
            text
            type="primary"
            @click="clearSelection"
          >
            清除选择
          </el-button>
        </div>
      </div>

      <!-- 数据列表 -->
      <div
        ref="listContainerRef"
        class="data-list"
      >
        <div
          v-if="filteredData.length === 0"
          class="empty-state"
        >
          <p style="margin-bottom: 20px;">
            暂无数据
          </p>
          <el-button
            type="primary"
            @click="$router.push('/upload')"
          >
            去上传数据
          </el-button>
        </div>

        <div
          v-else
          class="list-items"
        >
          <!-- 事件数据 -->
          <div 
            v-for="item in paginatedData" 
            :key="getItemKey(item)"
            class="list-item"
            :class="[getItemClass(item), { 'item-selected': isSelected(item) }]"
          >
            <div class="item-checkbox">
              <el-checkbox 
                :model-value="isSelected(item)"
                @change="(val: boolean) => { if (val !== isSelected(item)) toggleSelection(item) }"
              />
            </div>
            <div class="item-header">
              <span class="item-id">{{ getItemId(item) }}</span>
              <span class="item-type">{{ getItemType(item) }}</span>
              <span 
                v-if="isHighConfidenceCorrelation(item)" 
                class="correlation-badge"
                title="高置信度关联事件"
              >
                🔗 高置信度关联
              </span>
              <span 
                v-if="isHighFrequencyProblem(item)" 
                class="frequency-badge"
                title="高频问题类型"
              >
                🔥 高频问题
              </span>
              <span 
                v-if="isProblemHotspot(item)" 
                class="hotspot-badge"
                :class="`hotspot-${getHotspotSeverity(item)}`"
                :title="`问题高发区：${getItemLocation(item)}`"
              >
                📍 问题高发区
              </span>
              <span
                class="item-status"
                :class="getStatusClass(item)"
              >
                {{ getItemStatus(item) }}
              </span>
            </div>
            <div class="item-content">
              <p class="item-description">
                {{ getItemDescription(item) }}
              </p>
              <div class="item-meta">
                <span class="item-location">
                  📍 {{ getItemLocation(item) }}
                </span>
                <span class="item-time">
                  🕐 {{ getItemTime(item) }}
                </span>
                <span
                  v-if="isSensor(item)"
                  class="item-value"
                >
                  📊 数值: {{ (item as any).value }} {{ (item as any).unit }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <el-pagination
          v-if="totalPages > 1"
          v-model:current-page="currentPage"
          :total="filteredData.length"
          :page-size="pageSize"
          layout="total, prev, pager, next, jumper"
          class="pagination"
        />
      </div>
    </div>

    <!-- AI分析对话框 -->
    <el-dialog
      v-model="showAIDialog"
      title="AI分析结果"
      width="900px"
      :close-on-click-modal="false"
    >
      <div
        v-if="isAnalyzing"
        class="analyzing"
      >
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>AI正在分析中，请稍候...</span>
        <div
          v-if="analyzingProgress.total > 0"
          class="progress-info"
        >
          进度：{{ analyzingProgress.current }} / {{ analyzingProgress.total }}
        </div>
      </div>
      <div
        v-else-if="aiAnalysisResults.length > 0"
        class="ai-results-list"
      >
        <div 
          v-for="(analysisItem, index) in aiAnalysisResults" 
          :key="index"
          class="result-item-card"
        >
          <div class="result-item-header">
            <div class="item-info">
              <span class="item-id-label">
                {{ analysisItem.type === 'event' ? '事件' : '传感器' }}：
                {{ analysisItem.type === 'event' ? analysisItem.item.id : analysisItem.item.sensorId }}
              </span>
              <span class="item-type-label">{{ analysisItem.item.type }}</span>
            </div>
            <el-button 
              v-if="analysisItem.result && !analysisItem.error" 
              type="primary"
              size="small"
              @click="saveSingleAnalysisResult(analysisItem)"
            >
              保存
            </el-button>
          </div>
          
          <div
            v-if="analysisItem.error"
            class="result-error"
          >
            <el-alert
              :title="analysisItem.error"
              type="error"
              :closable="false"
            />
          </div>
          
          <div
            v-else-if="analysisItem.result"
            class="result-content"
          >
            <div class="result-section">
              <h4>问题归因</h4>
              <p>{{ analysisItem.result.analysis.cause }}</p>
            </div>
            <div class="result-section">
              <h4>处置建议</h4>
              <div
                v-if="isStructuredSuggestion(analysisItem.result.analysis.suggestion)"
                class="structured-suggestion"
              >
                <!-- 高频问题类型的处置建议 -->
                <div
                  v-if="getStructuredSuggestion(analysisItem.result.analysis.suggestion)?.高频问题类型"
                  class="suggestion-group"
                >
                  <h5 class="suggestion-group-title">
                    📋 高频问题类型处置建议
                  </h5>
                  <div class="suggestion-items">
                    <div 
                      v-for="(suggestion, problemType) in getStructuredSuggestion(analysisItem.result.analysis.suggestion)?.高频问题类型" 
                      :key="problemType"
                      class="suggestion-item"
                    >
                      <div class="suggestion-label">
                        <el-tag
                          type="warning"
                          size="small"
                        >
                          {{ problemType }}
                        </el-tag>
                      </div>
                      <div class="suggestion-content">
                        {{ suggestion }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 问题高发区的处置建议 -->
                <div
                  v-if="getStructuredSuggestion(analysisItem.result.analysis.suggestion)?.问题高发区"
                  class="suggestion-group"
                >
                  <h5 class="suggestion-group-title">
                    📍 问题高发区处置建议
                  </h5>
                  <div class="suggestion-items">
                    <div 
                      v-for="(suggestion, district) in getStructuredSuggestion(analysisItem.result.analysis.suggestion)?.问题高发区" 
                      :key="district"
                      class="suggestion-item"
                    >
                      <div class="suggestion-label">
                        <el-tag
                          type="info"
                          size="small"
                        >
                          {{ district }}
                        </el-tag>
                      </div>
                      <div class="suggestion-content">
                        {{ suggestion }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p v-else>
                {{ formatSuggestion(analysisItem.result.analysis.suggestion) }}
              </p>
            </div>
            <div class="result-section">
              <h4>优先级评估</h4>
              <el-tag 
                :type="analysisItem.result.analysis.priority === 'high' ? 'danger' : 
                  analysisItem.result.analysis.priority === 'medium' ? 'warning' : 'info'"
              >
                {{ analysisItem.result.analysis.priority === 'high' ? '高' : 
                  analysisItem.result.analysis.priority === 'medium' ? '中' : '低' }}
              </el-tag>
              <span
                v-if="analysisItem.result.analysis.estimatedTime"
                class="estimated-time"
              >
                预计处理时间：{{ analysisItem.result.analysis.estimatedTime }}
              </span>
            </div>
            
            <!-- 高频问题类型 -->
            <div
              v-if="analysisItem.result.analysis.frequentProblemTypes && analysisItem.result.analysis.frequentProblemTypes.length > 0"
              class="result-section"
            >
              <h4>高频问题类型</h4>
              <div class="frequent-types">
                <div 
                  v-for="(problem, idx) in analysisItem.result.analysis.frequentProblemTypes" 
                  :key="idx"
                  class="problem-type-item"
                >
                  <span class="type-name">{{ problem.type }}</span>
                  <span class="type-count">{{ problem.count }}次</span>
                  <el-progress 
                    :percentage="problem.percentage" 
                    :stroke-width="8"
                    :color="getProgressColor(problem.percentage)"
                  />
                </div>
              </div>
            </div>
            
            <!-- 问题高发区 -->
            <div
              v-if="analysisItem.result.analysis.problemHotspots && analysisItem.result.analysis.problemHotspots.length > 0"
              class="result-section"
            >
              <h4>问题高发区</h4>
              <div class="hotspots-list">
                <div 
                  v-for="(hotspot, idx) in analysisItem.result.analysis.problemHotspots" 
                  :key="idx"
                  class="hotspot-item"
                  :class="`hotspot-${hotspot.severity}`"
                >
                  <div class="hotspot-header">
                    <span class="hotspot-district">{{ hotspot.district }}</span>
                    <el-tag 
                      :type="hotspot.severity === 'high' ? 'danger' : hotspot.severity === 'medium' ? 'warning' : 'info'"
                      size="small"
                    >
                      {{ hotspot.severity === 'high' ? '高' : hotspot.severity === 'medium' ? '中' : '低' }}严重
                    </el-tag>
                    <span class="hotspot-count">{{ hotspot.count }}个问题</span>
                  </div>
                  <div class="hotspot-types">
                    <span class="types-label">主要问题类型：</span>
                    <el-tag 
                      v-for="(type, typeIdx) in hotspot.problemTypes" 
                      :key="typeIdx"
                      size="small"
                      class="type-tag"
                    >
                      {{ type }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-else
        class="no-results"
      >
        <p>暂无分析结果</p>
      </div>
      <template #footer>
        <el-button @click="showAIDialog = false">
          关闭
        </el-button>
        <el-button 
          v-if="aiAnalysisResults.length > 0 && !isAnalyzing" 
          type="primary"
          @click="saveAllAnalysisResults"
        >
          保存全部到历史记录
        </el-button>
      </template>
    </el-dialog>

    <!-- 历史分析记录对话框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="历史AI分析记录"
      width="900px"
    >
      <div
        v-if="aiAnalysisStore.history.length === 0"
        class="empty-history"
      >
        <p>暂无历史分析记录</p>
      </div>
      <div
        v-else
        class="history-list"
      >
        <div 
          v-for="record in aiAnalysisStore.history" 
          :key="record.id"
          class="history-item"
        >
          <div class="history-header">
            <span class="history-time">{{ formatTime(record.timestamp) }}</span>
            <el-tag 
              :type="record.analysis.priority === 'high' ? 'danger' : 
                record.analysis.priority === 'medium' ? 'warning' : 'info'"
              size="small"
            >
              {{ record.analysis.priority === 'high' ? '高' : 
                record.analysis.priority === 'medium' ? '中' : '低' }}优先级
            </el-tag>
            <el-button 
              type="danger" 
              size="small" 
              text
              @click="deleteHistoryRecord(record.id)"
            >
              删除
            </el-button>
          </div>
          <div class="history-content">
            <div class="history-section">
              <strong>问题归因：</strong>
              <p>{{ record.analysis.cause }}</p>
            </div>
            <div class="history-section">
              <strong>处置建议：</strong>
              <div
                v-if="isStructuredSuggestion(record.analysis.suggestion)"
                class="structured-suggestion"
              >
                <!-- 高频问题类型的处置建议 -->
                <div
                  v-if="getStructuredSuggestion(record.analysis.suggestion)?.高频问题类型"
                  class="suggestion-group"
                >
                  <h5 class="suggestion-group-title">
                    📋 高频问题类型处置建议
                  </h5>
                  <div class="suggestion-items">
                    <div 
                      v-for="(suggestion, problemType) in getStructuredSuggestion(record.analysis.suggestion)?.高频问题类型" 
                      :key="problemType"
                      class="suggestion-item"
                    >
                      <div class="suggestion-label">
                        <el-tag
                          type="warning"
                          size="small"
                        >
                          {{ problemType }}
                        </el-tag>
                      </div>
                      <div class="suggestion-content">
                        {{ suggestion }}
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 问题高发区的处置建议 -->
                <div
                  v-if="getStructuredSuggestion(record.analysis.suggestion)?.问题高发区"
                  class="suggestion-group"
                >
                  <h5 class="suggestion-group-title">
                    📍 问题高发区处置建议
                  </h5>
                  <div class="suggestion-items">
                    <div 
                      v-for="(suggestion, district) in getStructuredSuggestion(record.analysis.suggestion)?.问题高发区" 
                      :key="district"
                      class="suggestion-item"
                    >
                      <div class="suggestion-label">
                        <el-tag
                          type="info"
                          size="small"
                        >
                          {{ district }}
                        </el-tag>
                      </div>
                      <div class="suggestion-content">
                        {{ suggestion }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p v-else>
                {{ formatSuggestion(record.analysis.suggestion) }}
              </p>
            </div>
            <div
              v-if="record.events && record.events.length > 0"
              class="history-related"
            >
              <strong>关联事件：</strong>
              <span
                v-for="event in record.events"
                :key="event.id"
                class="related-item"
              >
                {{ event.id }}
              </span>
            </div>
            <div
              v-if="record.sensors && record.sensors.length > 0"
              class="history-related"
            >
              <strong>关联传感器：</strong>
              <span
                v-for="sensor in record.sensors"
                :key="sensor.sensorId"
                class="related-item"
              >
                {{ sensor.sensorId }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showHistoryDialog = false">
          关闭
        </el-button>
        <el-button 
          v-if="aiAnalysisStore.history.length > 0" 
          type="danger"
          @click="clearAllHistory"
        >
          清空所有记录
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import AppHeader from '@/components/AppHeader.vue'
import { useDataStore } from '@/stores/dataStore'
import { useAIAnalysisStore } from '@/stores/aiAnalysisStore'
import { analyzeData, analyzePatterns } from '@/services/ai'
import { calculateDistance } from '@/utils/geo'
import type { SensorData, CityEvent } from '@/types'
import dayjs from 'dayjs'

const dataStore = useDataStore()
const aiAnalysisStore = useAIAnalysisStore()

// 选择功能
const selectedItems = ref<Array<{ item: any; type: 'event' | 'sensor' }>>([])

// AI分析相关
const showAIDialog = ref(false)
const isAnalyzing = ref(false)
const aiAnalysisResults = ref<Array<{
  item: any
  type: 'event' | 'sensor'
  result: any
  error?: string
}>>([])
const analyzingProgress = ref({ current: 0, total: 0 })

// 历史记录对话框
const showHistoryDialog = ref(false)

// 异常关联分析：高置信度关联事件标记
const highConfidenceCorrelations = ref<Map<string, Set<string>>>(new Map())

// 问题聚类与热点识别：存储模式分析结果
const patternAnalysisResult = ref<{
  frequentProblemTypes: Array<{ type: string; count: number; percentage: number }>
  problemHotspots: Array<{ district: string; problemTypes: string[]; count: number; severity: 'high' | 'medium' | 'low' }>
  timestamp: string
} | null>(null)

// 视图切换
type ViewType = 'events' | 'sensors' | 'all'
const views = [
  { label: '合并视图', value: 'all' as ViewType },
  { label: '仅事件', value: 'events' as ViewType },
  { label: '仅传感器', value: 'sensors' as ViewType }
]
const currentView = ref<ViewType>('all')

// 搜索和筛选
const searchText = ref('')
const filterDateRange = ref<[string, string] | null>(null)
const filterDistrict = ref('')
const filterType = ref('')
const filterStatus = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(20)

// 计算属性
const allData = computed(() => {
  if (currentView.value === 'events') {
    return dataStore.events as any[]
  } else if (currentView.value === 'sensors') {
    return dataStore.sensors as any[]
  } else {
    return [
      ...dataStore.events.map(e => ({ ...e, _type: 'event' })),
      ...dataStore.sensors.map(s => ({ ...s, _type: 'sensor' }))
    ]
  }
})

const filteredData = computed(() => {
  let result = allData.value

  // 搜索过滤
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(item => {
      const description = getItemDescription(item).toLowerCase()
      const location = getItemLocation(item).toLowerCase()
      const type = getItemType(item).toLowerCase()
      return description.includes(keyword) || 
             location.includes(keyword) || 
             type.includes(keyword)
    })
  }

  // 区域过滤
  if (filterDistrict.value) {
    result = result.filter(item => {
      const location = isSensor(item) ? item.location : item.location
      return location.district === filterDistrict.value
    })
  }

  // 类型过滤
  if (filterType.value) {
    result = result.filter(item => {
      const type = isSensor(item) ? item.type : item.type
      return type === filterType.value
    })
  }

  // 状态过滤
  if (filterStatus.value) {
    result = result.filter(item => {
      const status = getItemStatus(item)
      return status === filterStatus.value
    })
  }

  // 时间范围过滤
  if (filterDateRange.value && filterDateRange.value.length === 2) {
    const [startTime, endTime] = filterDateRange.value
    const start = dayjs(startTime).valueOf()
    const end = dayjs(endTime).valueOf()
    
    result = result.filter(item => {
      const itemTime = isSensor(item) ? item.timestamp : item.reportTime
      const time = dayjs(itemTime).valueOf()
      // 判断时间是否在范围内（包含边界）
      return time >= start && time <= end
    })
  }

  return result
})

const totalData = computed(() => allData.value.length)

const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize.value))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// 获取区域列表
const districts = computed(() => {
  const districtsSet = new Set<string>()
  dataStore.events.forEach(e => districtsSet.add(e.location.district))
  dataStore.sensors.forEach(s => districtsSet.add(s.location.district))
  return Array.from(districtsSet).sort()
})

// 获取类型列表
const types = computed(() => {
  const typesSet = new Set<string>()
  if (currentView.value === 'events' || currentView.value === 'all') {
    dataStore.events.forEach(e => typesSet.add(e.type))
  }
  if (currentView.value === 'sensors' || currentView.value === 'all') {
    dataStore.sensors.forEach(s => typesSet.add(s.type))
  }
  return Array.from(typesSet).sort()
})

// 工具函数
function isSensor(item: any): item is SensorData {
  return 'sensorId' in item || item._type === 'sensor'
}

function getItemKey(item: any): string {
  return isSensor(item) ? item.sensorId : item.id
}

function getItemId(item: any): string {
  return isSensor(item) ? item.sensorId : item.id
}

function getItemType(item: any): string {
  return item.type
}

function getItemStatus(item: any): string {
  return item.status
}

function getItemDescription(item: any): string {
  if (isSensor(item)) {
    return `${item.type}: ${item.value} ${item.unit} (阈值: ${item.threshold} ${item.unit})`
  }
  return item.description
}

function getItemLocation(item: any): string {
  return `${item.location.district} ${item.location.street}`
}

function getItemTime(item: any): string {
  const time = isSensor(item) ? item.timestamp : item.reportTime
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

function getItemClass(item: any): string {
  const status = getItemStatus(item)
  if (status === '紧急' || status === '异常') {
    return 'item-urgent'
  }
  return ''
}

function getStatusClass(item: any): string {
  const status = getItemStatus(item)
  return `status-${status}`
}

const listContainerRef = ref<HTMLElement | null>(null)

// 清除筛选
function clearFilters() {
  searchText.value = ''
  filterDateRange.value = null
  filterDistrict.value = ''
  filterType.value = ''
  filterStatus.value = ''
  currentPage.value = 1
}

// 导出数据
function exportData() {
  const data = filteredData.value
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `city-data-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 异常关联分析：自动关联传感器异常与附近事件
function analyzeCorrelations() {
  highConfidenceCorrelations.value.clear()
  
  // 获取所有异常传感器
  const abnormalSensors = dataStore.sensors.filter(s => s.status === '异常')
  
  // 获取所有事件
  const events = dataStore.events
  
  // 对每个异常传感器，查找附近的事件
  abnormalSensors.forEach(sensor => {
    const relatedEvents: string[] = []
    
    events.forEach(event => {
      // 计算距离（米）
      const distance = calculateDistance(sensor.location, event.location)
      
      // 如果距离在500米内，且事件类型与传感器类型相关，则关联
      if (distance <= 500) {
        // 检查类型相关性（例如：积水传感器异常与道路积水事件相关）
        const isRelated = checkTypeCorrelation(sensor.type, event.type)
        
        if (isRelated) {
          relatedEvents.push(event.id)
        }
      }
    })
    
    // 如果有关联事件，标记为高置信度关联
    if (relatedEvents.length > 0) {
      relatedEvents.forEach(eventId => {
        if (!highConfidenceCorrelations.value.has(eventId)) {
          highConfidenceCorrelations.value.set(eventId, new Set())
        }
        highConfidenceCorrelations.value.get(eventId)!.add(sensor.sensorId)
      })
    }
  })
}

// 检查传感器类型和事件类型是否相关
function checkTypeCorrelation(sensorType: string, eventType: string): boolean {
  const correlationMap: Record<string, string[]> = {
    '积水监测': ['道路积水', '内涝'],
    '空气质量传感器': ['空气污染', '雾霾'],
    '噪音传感器': ['噪音污染', '施工噪音'],
    '温度传感器': ['高温', '低温'],
    '路灯电流': ['路灯故障']
  }
  
  for (const [sensor, events] of Object.entries(correlationMap)) {
    if (sensorType.includes(sensor) || sensor.includes(sensorType)) {
      return events.some(e => eventType.includes(e) || e.includes(eventType))
    }
  }
  
  return false
}

// 判断是否为高置信度关联事件
function isHighConfidenceCorrelation(item: any): boolean {
  if (isSensor(item)) return false
  return highConfidenceCorrelations.value.has(item.id)
}

// 判断是否为高频问题类型
function isHighFrequencyProblem(item: any): boolean {
  if (!patternAnalysisResult.value) return false
  const itemType = getItemType(item)
  return patternAnalysisResult.value.frequentProblemTypes.some(
    problem => problem.type === itemType
  )
}

// 判断是否属于问题高发区
function isProblemHotspot(item: any): boolean {
  if (!patternAnalysisResult.value) return false
  const district = isSensor(item) ? item.location.district : item.location.district
  return patternAnalysisResult.value.problemHotspots.some(
    hotspot => hotspot.district === district
  )
}

// 获取问题高发区的严重程度
function getHotspotSeverity(item: any): 'high' | 'medium' | 'low' {
  if (!patternAnalysisResult.value) return 'low'
  const district = isSensor(item) ? item.location.district : item.location.district
  const hotspot = patternAnalysisResult.value.problemHotspots.find(
    h => h.district === district
  )
  return hotspot?.severity || 'low'
}

// 选择功能
function isSelected(item: any): boolean {
  const key = isSensor(item) ? item.sensorId : item.id
  return selectedItems.value.some(sel => {
    const selKey = isSensor(sel.item) ? sel.item.sensorId : sel.item.id
    return selKey === key
  })
}

function toggleSelection(item: any) {
  const key = isSensor(item) ? item.sensorId : item.id
  const index = selectedItems.value.findIndex(sel => {
    const selKey = isSensor(sel.item) ? sel.item.sensorId : sel.item.id
    return selKey === key
  })
  
  if (index !== -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push({
      item,
      type: isSensor(item) ? 'sensor' : 'event'
    })
  }
}

function clearSelection() {
  selectedItems.value = []
}

// 全选/取消全选功能
const allSelected = computed(() => {
  if (paginatedData.value.length === 0) return false
  return paginatedData.value.every(item => isSelected(item))
})

function toggleSelectAll() {
  if (allSelected.value) {
    // 取消全选
    paginatedData.value.forEach(item => {
      const key = isSensor(item) ? item.sensorId : item.id
      const index = selectedItems.value.findIndex(sel => {
        const selKey = isSensor(sel.item) ? sel.item.sensorId : sel.item.id
        return selKey === key
      })
      if (index !== -1) {
        selectedItems.value.splice(index, 1)
      }
    })
  } else {
    // 全选
    paginatedData.value.forEach(item => {
      if (!isSelected(item)) {
        selectedItems.value.push({
          item,
          type: isSensor(item) ? 'sensor' : 'event'
        })
      }
    })
  }
}

// 自动进行问题聚类与热点识别（后台执行，不显示对话框）
async function autoPatternAnalysis() {
  if (dataStore.events.length === 0 && dataStore.sensors.length === 0) {
    return
  }

  // 如果已经有最近的分析结果（5分钟内），则不重复分析
  if (patternAnalysisResult.value) {
    const lastAnalysisTime = new Date(patternAnalysisResult.value.timestamp).getTime()
    const now = Date.now()
    if (now - lastAnalysisTime < 5 * 60 * 1000) {
      return // 5分钟内的分析结果仍然有效
    }
  }

  try {
    const result = await analyzePatterns(dataStore.events, dataStore.sensors)
    
    // 存储分析结果，用于标记数据
    if (result.analysis.frequentProblemTypes && result.analysis.problemHotspots) {
      patternAnalysisResult.value = {
        frequentProblemTypes: result.analysis.frequentProblemTypes,
        problemHotspots: result.analysis.problemHotspots,
        timestamp: result.timestamp
      }
      
      console.log('自动模式分析完成，已识别高频问题类型和问题高发区')
    }
  } catch (error: any) {
    console.error('自动模式分析失败:', error)
    // 静默失败，不影响用户体验
  }
}

// 全局模式分析：识别高频问题类型和问题高发区（手动触发，显示对话框）
async function handlePatternAnalysis() {
  if (dataStore.events.length === 0 && dataStore.sensors.length === 0) {
    ElMessage.warning('暂无数据可供分析')
    return
  }

  showAIDialog.value = true
  isAnalyzing.value = true
  aiAnalysisResults.value = []
  analyzingProgress.value = { current: 1, total: 1 }

  try {
    const result = await analyzePatterns(dataStore.events, dataStore.sensors)
    
    // 更新存储的分析结果
    if (result.analysis.frequentProblemTypes && result.analysis.problemHotspots) {
      patternAnalysisResult.value = {
        frequentProblemTypes: result.analysis.frequentProblemTypes,
        problemHotspots: result.analysis.problemHotspots,
        timestamp: result.timestamp
      }
    }
    
    aiAnalysisResults.value = [{
      item: { id: '全局分析', type: '模式分析' },
      type: 'event',
      result: result
    }]
    
    ElMessage.success('全局模式分析完成')
  } catch (error: any) {
    console.error('全局模式分析错误:', error)
    ElMessage.error(error.message || '全局模式分析失败，请稍后重试')
    
    aiAnalysisResults.value = [{
      item: { id: '全局分析', type: '模式分析' },
      type: 'event',
      result: null,
      error: error.message || '分析失败'
    }]
  } finally {
    isAnalyzing.value = false
  }
}

// AI分析功能：为每条数据单独分析
async function handleAIAnalysis() {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请至少选择一条数据进行分析')
    return
  }
  
  const totalCount = selectedItems.value.length
  if (totalCount > 10) {
    const confirmed = await ElMessageBox.confirm(
      `已选择 ${totalCount} 条数据，将逐条进行分析，可能需要较长时间。是否继续？`,
      '提示',
      {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).catch(() => false)
    
    if (!confirmed) {
      return
    }
  }
  
  showAIDialog.value = true
  isAnalyzing.value = true
  aiAnalysisResults.value = []
  analyzingProgress.value = { current: 0, total: selectedItems.value.length }
  
  // 为每条数据单独进行AI分析
  for (let i = 0; i < selectedItems.value.length; i++) {
    const selectedItem = selectedItems.value[i]
    
    // 初始化结果项
    const resultItem = {
      item: selectedItem.item,
      type: selectedItem.type,
      result: null as any,
      error: undefined as string | undefined
    }
    aiAnalysisResults.value.push(resultItem)
    
    try {
      analyzingProgress.value.current = i + 1
      
      // 根据类型构建分析数据
      let result: any
      if (selectedItem.type === 'event') {
        result = await analyzeData([selectedItem.item as CityEvent], undefined)
      } else {
        result = await analyzeData(undefined, [selectedItem.item as SensorData])
      }
      
      // 验证结果
      if (!result || !result.analysis) {
        throw new Error('AI返回的结果格式不正确')
      }
      
      resultItem.result = result
    } catch (error: any) {
      console.error(`分析 ${selectedItem.type === 'event' ? selectedItem.item.id : selectedItem.item.sensorId} 失败:`, error)
      resultItem.error = error.message || 'AI分析失败，请稍后重试'
    }
    
    // 添加延迟，避免API限流
    if (i < selectedItems.value.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  isAnalyzing.value = false
  
  // 统计成功和失败的数量
  const successCount = aiAnalysisResults.value.filter(r => r.result && !r.error).length
  const failCount = aiAnalysisResults.value.filter(r => r.error).length
  
  if (successCount > 0) {
    ElMessage.success(`分析完成：成功 ${successCount} 条${failCount > 0 ? `，失败 ${failCount} 条` : ''}`)
  } else {
    ElMessage.error('所有分析均失败，请检查网络连接或API配置')
  }
}

// 保存单条分析结果
function saveSingleAnalysisResult(analysisItem: any) {
  if (analysisItem.result && !analysisItem.error) {
    aiAnalysisStore.addRecord(analysisItem.result)
    ElMessage.success('分析结果已保存到历史记录')
  }
}

// 保存所有分析结果
function saveAllAnalysisResults() {
  const validResults = aiAnalysisResults.value.filter(r => r.result && !r.error)
  
  if (validResults.length === 0) {
    ElMessage.warning('没有可保存的分析结果')
    return
  }
  
  validResults.forEach(item => {
    aiAnalysisStore.addRecord(item.result)
  })
  
  ElMessage.success(`已保存 ${validResults.length} 条分析结果到历史记录`)
}

// 历史记录管理
function deleteHistoryRecord(id: string) {
  ElMessageBox.confirm('确定要删除这条分析记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    aiAnalysisStore.deleteRecord(id)
    ElMessage.success('删除成功')
  }).catch(() => {
    // 用户取消操作，无需处理
  })
}

function clearAllHistory() {
  ElMessageBox.confirm('确定要清空所有历史记录吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    aiAnalysisStore.clearHistory()
    ElMessage.success('已清空所有历史记录')
  }).catch(() => {
    // 用户取消操作，无需处理
  })
}

function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

function getProgressColor(percentage: number): string {
  if (percentage >= 30) return '#f56c6c'
  if (percentage >= 15) return '#e6a23c'
  return '#409eff'
}

// 判断处置建议是否为结构化格式（对象格式）
function isStructuredSuggestion(suggestion: any): boolean {
  if (!suggestion) return false
  if (typeof suggestion === 'string') {
    // 尝试解析字符串为JSON
    try {
      const parsed = JSON.parse(suggestion)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) &&
             (parsed['高频问题类型'] || parsed['问题高发区'])
    } catch {
      return false
    }
  }
  return typeof suggestion === 'object' && suggestion !== null && !Array.isArray(suggestion) &&
         (suggestion['高频问题类型'] || suggestion['问题高发区'])
}

// 获取结构化的处置建议
function getStructuredSuggestion(suggestion: any): {
  高频问题类型?: Record<string, string>
  问题高发区?: Record<string, string>
} | null {
  if (!suggestion) return null
  
  let parsed: any = suggestion
  
  // 如果是字符串，尝试解析为JSON
  if (typeof suggestion === 'string') {
    try {
      parsed = JSON.parse(suggestion)
    } catch {
      return null
    }
  }
  
  // 检查是否为结构化格式
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    if (parsed['高频问题类型'] || parsed['问题高发区']) {
      return parsed
    }
  }
  
  return null
}

// 格式化处置建议（用于非结构化格式）
function formatSuggestion(suggestion: any): string {
  if (!suggestion) return '未提供建议'
  if (typeof suggestion === 'string') return suggestion
  if (typeof suggestion === 'object') {
    try {
      return JSON.stringify(suggestion, null, 2)
    } catch {
      return String(suggestion)
    }
  }
  return String(suggestion)
}

// 监听筛选变化，重置页码
watch([filterDistrict, filterType, filterStatus, filterDateRange, searchText, currentView], () => {
  currentPage.value = 1
})

// 监听数据变化，重新分析关联和模式
watch([() => dataStore.events, () => dataStore.sensors], () => {
  analyzeCorrelations()
  // 延迟执行自动模式分析，避免阻塞UI
  setTimeout(() => {
    autoPatternAnalysis()
  }, 2000) // 延迟2秒执行
}, { deep: true })

// 初始化时分析关联和模式
onMounted(() => {
  analyzeCorrelations()
  // 如果有数据，自动进行模式分析
  if (dataStore.events.length > 0 || dataStore.sensors.length > 0) {
    setTimeout(() => {
      autoPatternAnalysis()
    }, 2000) // 延迟2秒执行
  }
})
</script>

<style scoped>
.list-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  width: 100%;
  overflow-x: hidden;
}

.list-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .list-content {
    padding: 15px 10px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .toolbar-right {
    flex-direction: column;
    width: 100%;
  }
  
  .search-input {
    width: 100%;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .filters :deep(.el-date-editor) {
    width: 100% !important;
    flex-grow:0;
  }
  
  .data-list {
    padding: 15px;
  }
  
  .item-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .item-meta {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .view-switch {
    flex-direction: column;
    width: 100%;
  }
  
  .view-btn {
    width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
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

.view-switch {
  display: flex;
  gap: 10px;
}

.view-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.view-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.view-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  width: 200px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.filters :deep(.el-date-editor) {
  width: 300px;
  flex-grow:0;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background: white;
  min-width: 150px;
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

.btn-secondary:hover {
  background: #5a6268;
}

.stats-bar {
  background: white;
  padding: 10px 15px;
  border-radius: 5px;
  margin-bottom: 15px;
  color: #666;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.stats-left {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.stats-right {
  display: flex;
  gap: 10px;
}

.selected-count {
  color: #667eea;
  font-weight: bold;
}

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  padding: 0;
}

.btn-link:hover {
  color: #5568d3;
}

.btn-ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-ai:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #6a3d7a 100%);
}

.btn-ai:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-pattern {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
}

.btn-pattern:hover {
  background: linear-gradient(135deg, #e081e8 0%, #e04a5f 100%);
}

.data-list {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.list-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s;
  background: white;
  display: flex;
  gap: 15px;
  position: relative;
  align-items: center;
}

.list-item.item-selected {
  border-color: #667eea;
  background: #f0f4ff;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.item-checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
  align-items: center;
}

.item-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.list-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.list-item.item-urgent {
  border-left: 4px solid #dc3545;
  background: #fff5f5;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  flex: 1;
}

.correlation-badge {
  padding: 4px 8px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(255, 107, 107, 0.3);
}

.frequency-badge {
  padding: 4px 8px;
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
}

.hotspot-badge {
  padding: 4px 8px;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hotspot-badge.hotspot-high {
  background: linear-gradient(135deg, #f56c6c 0%, #e63946 100%);
  box-shadow: 0 2px 4px rgba(245, 108, 108, 0.3);
}

.hotspot-badge.hotspot-medium {
  background: linear-gradient(135deg, #e6a23c 0%, #d68910 100%);
  box-shadow: 0 2px 4px rgba(230, 162, 60, 0.3);
}

.hotspot-badge.hotspot-low {
  background: linear-gradient(135deg, #409eff 0%, #2979ff 100%);
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.item-id {
  font-weight: bold;
  color: #333;
}

.item-type {
  padding: 4px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 12px;
}

.item-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-紧急,
.status-异常 {
  background: #f8d7da;
  color: #721c24;
}

.status-未处理 {
  background: #fff3cd;
  color: #856404;
}

.status-已派单,
.status-处理中 {
  background: #d1ecf1;
  color: #0c5460;
}

.item-content {
  color: #666;
}

.item-description {
  margin: 0 0 10px 0;
  line-height: 1.6;
}

.item-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 14px;
  color: #999;
}

.item-location,
.item-time,
.item-value {
  display: flex;
  align-items: center;
  gap: 5px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 15px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
}

/* AI分析对话框样式 */
.analyzing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 40px;
  color: #666;
}

.progress-info {
  font-size: 14px;
  color: #999;
  margin-top: 10px;
}

.ai-results-list {
  max-height: 600px;
  overflow-y: auto;
  padding: 10px 0;
}

.result-item-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background: #fafafa;
}

.result-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.item-id-label {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.item-type-label {
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
}

.result-error {
  margin-top: 10px;
}

.result-content {
  margin-top: 10px;
}

.no-results {
  text-align: center;
  padding: 40px;
  color: #999;
}

.result-section {
  margin-bottom: 20px;
}

.result-section h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.result-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.estimated-time {
  margin-left: 10px;
  color: #999;
  font-size: 14px;
}

/* 历史记录对话框样式 */
.empty-history {
  text-align: center;
  padding: 40px;
  color: #999;
}

.history-list {
  max-height: 500px;
  overflow-y: auto;
}

.history-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background: #fafafa;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.history-time {
  flex: 1;
  color: #666;
  font-size: 14px;
}

.history-content {
  color: #333;
}

.history-section {
  margin-bottom: 12px;
}

.history-section strong {
  color: #333;
  display: block;
  margin-bottom: 5px;
}

.history-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.history-related {
  margin-top: 10px;
  font-size: 13px;
}

.history-related strong {
  color: #333;
  margin-right: 5px;
}

.related-item {
  display: inline-block;
  padding: 2px 8px;
  margin: 2px 4px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 3px;
  font-size: 12px;
}

/* 高频问题类型样式 */
.frequent-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.problem-type-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.type-name {
  min-width: 120px;
  font-weight: 500;
  color: #333;
}

.type-count {
  min-width: 60px;
  color: #666;
  font-size: 14px;
}

.problem-type-item :deep(.el-progress) {
  flex: 1;
}

/* 问题高发区样式 */
.hotspots-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hotspot-item {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: white;
}

.hotspot-item.hotspot-high {
  border-left: 4px solid #f56c6c;
  background: #fef0f0;
}

.hotspot-item.hotspot-medium {
  border-left: 4px solid #e6a23c;
  background: #fdf6ec;
}

.hotspot-item.hotspot-low {
  border-left: 4px solid #409eff;
  background: #ecf5ff;
}

.hotspot-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.hotspot-district {
  font-weight: bold;
  font-size: 15px;
  color: #333;
  flex: 1;
}

.hotspot-count {
  color: #666;
  font-size: 13px;
}

.hotspot-types {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.types-label {
  color: #666;
  font-size: 13px;
}

.type-tag {
  margin: 0;
}

/* 结构化处置建议样式 */
.structured-suggestion {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.suggestion-group {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  border-left: 4px solid #667eea;
}

.suggestion-group-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.suggestion-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-item {
  background: white;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-label {
  display: flex;
  align-items: center;
}

.suggestion-content {
  color: #666;
  line-height: 1.6;
  font-size: 14px;
  padding-left: 4px;
}
</style>
