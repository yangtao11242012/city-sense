/**
 * 应用入口文件
 * 负责初始化 Vue 应用、配置状态管理和路由
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// @ts-ignore
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// 创建 Vue 应用实例
const app = createApp(App)

// 注册 Pinia 状态管理
app.use(createPinia())

// 注册 Element Plus 组件库（配置中文语言）
app.use(ElementPlus, {
  locale: zhCn
})

// 注册 Vue Router 路由
app.use(router)

// 挂载应用到 DOM
app.mount('#app')

