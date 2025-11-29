<template>
  <header class="header">
    <div class="header-content">
      <h1 class="title">
        智慧城市运行态势感知系统
      </h1>
      <nav class="nav">
        <router-link
          to="/upload"
          class="nav-item"
          :class="{ active: isActive('/upload') }"
        >
          数据上传
        </router-link>
        <router-link
          to="/list"
          class="nav-item"
          :class="{ active: isActive('/list') }"
        >
          数据列表
        </router-link>
        <router-link
          to="/dashboard"
          class="nav-item"
          :class="{ active: isActive('/dashboard') }"
        >
          大屏
        </router-link>
        <router-link
          to="/warnings"
          class="nav-item"
          :class="{ active: isActive('/warnings') }"
        >
          预警管理
        </router-link>
      </nav>
    </div>
    <div class="header-actions">
      <el-button
        class="report-btn"
        type="primary"
        @click="showReport = true"
      >
        <span class="report-icon">📄</span>
        <span class="report-text">城市运行简报</span>
      </el-button>
      <el-button
        class="ai-chat-btn"
        type="primary"
        @click="showAIChat = true"
      >
        <span class="ai-icon">🤖</span>
        <span class="ai-text">AI对话助手</span>
      </el-button>
    </div>
    <!-- AI对话对话框 -->
    <AIChatDialog v-model="showAIChat" />
    <!-- 城市运行简报对话框 -->
    <DailyReportDialog v-model="showReport" />
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import AIChatDialog from './AIChatDialog.vue'
import DailyReportDialog from './DailyReportDialog.vue'

const route = useRoute()
const showAIChat = ref(false)
const showReport = ref(false)

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>

<style scoped>
.header {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.title {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.nav {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.nav-item {
  padding: 8px 16px;
  text-decoration: none;
  color: #666;
  border-radius: 5px;
  transition: all 0.3s;
}

.nav-item:hover {
  background: #f0f0f0;
  color: #667eea;
}

.nav-item.active {
  background: #667eea;
  color: #fff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.ai-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.ai-icon {
  font-size: 18px;
}

.ai-text {
  white-space: nowrap;
}

.report-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #4a90e2 0%, #50c9ff 100%);
  border: none;
}

.report-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
}

.report-icon {
  font-size: 18px;
}

.report-text {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .header {
    padding: 15px;
  }

  .title {
    font-size: 20px;
  }

  .nav-item {
    font-size: 12px;
    padding: 6px 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .ai-chat-btn {
    padding: 8px 12px;
    font-size: 12px;
  }

  .ai-text {
    display: none;
  }

  .report-btn {
    padding: 8px 12px;
    font-size: 12px;
  }

  .report-text {
    display: none;
  }
}
</style>


