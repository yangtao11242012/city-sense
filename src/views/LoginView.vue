<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="title">
        智慧城市运行态势感知系统
      </h1>
      <p class="subtitle">
        请先登录系统后再进行数据上传与分析
      </p>

      <el-form
        class="form"
        label-width="60px"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名">
          <el-input
            v-model="username"
            placeholder="请输入用户名"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          :closable="false"
          style="margin-bottom: 14px;"
        />

        <el-button
          type="primary"
          style="width: 100%;"
          @click="handleLogin"
        >
          登录
        </el-button>

        <p class="hint">
          测试账号：用户名 <strong>admin</strong>，密码 <strong>123456</strong>（已默认填入）
        </p>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { useWarnStore } from '@/stores/warnStore'
import { useAIAnalysisStore } from '@/stores/aiAnalysisStore'

// 登录表单默认值
const username = ref('admin')
const password = ref('123456')
const errorMessage = ref('')

const router = useRouter()
const dataStore = useDataStore()
const warnStore = useWarnStore()
const aiAnalysisStore = useAIAnalysisStore()

/**
 * 处理登录
 * 要求：用户名为 admin，密码为 123456
 * 登录成功后：
 * 1. 清空所有已上传的数据
 * 2. 清空所有预警数据（包括预警列表、历史记录、已关闭的通知记录）
 * 3. 清空所有历史AI分析记录
 * 4. 停止自动检查预警（等上传数据后再自动生成）
 * 5. 跳转到数据上传页面
 */
function handleLogin() {
  if (username.value === 'admin' && password.value === '123456') {
    // 清空所有上传数据
    dataStore.clearData()
    
    // 清空所有预警数据（包括预警列表、历史记录、已关闭的通知记录）
    warnStore.clearWarnings()
    
    // 清空所有历史AI分析记录
    aiAnalysisStore.clearHistory()
    
    // 清空错误信息
    errorMessage.value = ''
    // 跳转到数据上传页面
    router.push('/upload')
  } else {
    errorMessage.value = '用户名或密码错误，请确认后重新输入'
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 32px 28px 26px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
}

.title {
  margin: 0 0 10px 0;
  font-size: 22px;
  color: #333;
  text-align: center;
}

.subtitle {
  margin: 0 0 24px 0;
  font-size: 13px;
  color: #666;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  color: #555;
}

.form-item input {
  padding: 9px 11px;
  border-radius: 6px;
  border: 1px solid #d0d5dd;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.form-item input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.25);
}

.error-message {
  margin: 0;
  font-size: 13px;
  color: #dc3545;
}

.btn {
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: #fff;
  width: 100%;
}

.btn-primary:hover {
  background: #5568d3;
}

.hint {
  margin: 10px 0 0 0;
  font-size: 12px;
  color: #777;
  text-align: center;
}

.hint strong {
  color: #333;
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px 18px 20px;
  }

  .title {
    font-size: 20px;
  }
}
</style>


