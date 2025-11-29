import { createRouter, createWebHistory } from 'vue-router'

/**
 * 创建路由实例
 * 使用 HTML5 History 模式，支持路由懒加载
 */
const router = createRouter({
  // 使用 HTML5 History API 模式
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 登录页面（首页）
    {
      path: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    // 数据上传页面
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../views/UploadView.vue')
    },
     // 数据列表页面
     {
      path: '/list',
      name: 'list',
      component: () => import('../views/ListView.vue')
    },
    // 城市运行态势大屏页面
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue')
    },
    // 预警管理页面
    {
      path: '/warnings',
      name: 'warnings',
      component: () => import('../views/WarningsView.vue')
    }
  ]
})

export default router

