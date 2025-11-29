<!--
  AI对话助手对话框组件
  功能：
  - 支持自然语言查询城市运行数据
  - 支持上下文记忆（追问功能）
  - 结合当前加载的数据回答问题
-->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="AI对话助手"
    width="800px"
    :close-on-click-modal="false"
    class="ai-chat-dialog"
  >
    <div class="chat-container">
      <!-- 对话历史 -->
      <div
        ref="messagesContainerRef"
        class="chat-messages"
      >
        <div
          v-if="messages.length === 0"
          class="empty-state"
        >
          <div class="empty-icon">
            🤖
          </div>
          <p class="empty-text">
            我是AI对话助手，可以帮您查询和分析城市运行数据
          </p>
          <div class="example-questions">
            <p class="example-title">
              示例问题：
            </p>
            <div class="example-list">
              <button
                v-for="(example, index) in exampleQuestions"
                :key="index"
                class="example-btn"
                @click="sendMessage(example)"
              >
                {{ example }}
              </button>
            </div>
          </div>
        </div>
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.role]"
        >
          <div class="message-avatar">
            <span v-if="message.role === 'user'">👤</span>
            <span v-else>🤖</span>
          </div>
          <div class="message-content">
            <div
              class="message-text"
              v-html="formatMessage(message.content)"
            />
            <div class="message-time">
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>
        <div
          v-if="isLoading"
          class="message assistant"
        >
          <div class="message-avatar">
            🤖
          </div>
          <div class="message-content">
            <div class="message-text loading">
              <span class="loading-dot" />
              <span class="loading-dot" />
              <span class="loading-dot" />
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入您的问题，例如：今天哪些区域积水最严重？"
          class="chat-input"
          @keydown.ctrl.enter="handleSend"
          @keydown.meta.enter="handleSend"
        />
        <div class="input-actions">
          <div class="input-hint">
            <span>按 Ctrl+Enter 或 Cmd+Enter 发送</span>
          </div>
          <el-button
            type="primary"
            :loading="isLoading"
            :disabled="!inputMessage.trim()"
            class="send-btn"
            @click="handleSend"
          >
            发送
          </el-button>
          <el-button
            :disabled="messages.length === 0 || isLoading"
            class="clear-btn"
            @click="clearHistory"
          >
            清空对话
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/stores/dataStore'
import { chatWithAI } from '@/services/ai'
import dayjs from 'dayjs'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dataStore = useDataStore()

// 对话框显示状态
const dialogVisible = ref(props.modelValue)
const inputMessage = ref('')
const messages = ref<Message[]>([])
const isLoading = ref(false)
const messagesContainerRef = ref<HTMLElement | null>(null)

// 示例问题
const exampleQuestions = [
  '今天哪些区域积水最严重？',
  '列出所有高优先级的路灯故障',
  '异常传感器主要集中在哪些区域？',
  '最近有哪些紧急事件？',
  '统计各类型事件的数量分布'
]

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
})

// 监听 dialogVisible 变化，同步到父组件
watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 格式化消息内容（支持换行）
function formatMessage(content: string): string {
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

// 格式化时间
function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('HH:mm:ss')
}

// 发送消息
async function handleSend() {
  if (!inputMessage.value.trim() || isLoading.value) {
    return
  }

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  })

  // 滚动到底部
  scrollToBottom()

  // 设置加载状态
  isLoading.value = true

  try {
    // 构建对话历史（用于上下文记忆）
    const conversationHistory = messages.value
      .filter(m => m.role === 'assistant' || m.role === 'user')
      .slice(-10) // 只保留最近10轮对话作为上下文
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))

    // 调用AI服务，传入当前数据和对话历史
    const response = await chatWithAI(
      userMessage,
      {
        events: dataStore.events,
        sensors: dataStore.sensors
      },
      conversationHistory
    )

    // 添加AI回复
    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    })

    // 滚动到底部
    scrollToBottom()
  } catch (error: any) {
    console.error('AI对话失败:', error)
    ElMessage.error(`AI对话失败: ${error.message || '未知错误'}`)
    
    // 添加错误消息
    messages.value.push({
      role: 'assistant',
      content: `抱歉，我遇到了一些问题：${error.message || '未知错误'}。请稍后重试。`,
      timestamp: new Date().toISOString()
    })
  } finally {
    isLoading.value = false
  }
}

// 发送示例问题
function sendMessage(question: string) {
  inputMessage.value = question
  handleSend()
}

// 清空对话历史
function clearHistory() {
  messages.value = []
  inputMessage.value = ''
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
    }
  })
}

// 监听消息变化，自动滚动
watch(messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped>
.ai-chat-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 24px;
  color: #666;
}

.example-questions {
  width: 100%;
  max-width: 500px;
}

.example-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-btn {
  padding: 10px 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: #333;
  transition: all 0.3s;
}

.example-btn:hover {
  background: #f0f4ff;
  border-color: #667eea;
  color: #667eea;
  transform: translateX(5px);
}

.message {
  display: flex;
  gap: 12px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-content {
  flex: 1;
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message.user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  line-height: 1.6;
  word-wrap: break-word;
  color: #333;
}

.message.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-text.loading {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: loading 1.4s infinite ease-in-out;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-time {
  font-size: 12px;
  color: #999;
  padding: 0 4px;
}

.chat-input-area {
  padding: 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.chat-input {
  margin-bottom: 12px;
}

.chat-input :deep(.el-textarea__inner) {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-size: 14px;
  line-height: 1.6;
}

.chat-input :deep(.el-textarea__inner):focus {
  border-color: #667eea;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-hint {
  font-size: 12px;
  color: #999;
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.send-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3d7a 100%);
}

.clear-btn {
  margin-left: 8px;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-chat-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 0 auto;
  }

  .chat-container {
    height: 500px;
  }

  .message-content {
    max-width: 85%;
  }
}
</style>

