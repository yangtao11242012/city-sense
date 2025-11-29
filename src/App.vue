<!--
  应用根组件
  智慧城市运行态势感知系统
  提供路由视图容器和全局样式
-->
<template>
  <!-- 路由视图容器，根据路由显示不同的页面组件 -->
  <router-view />
  
  <!-- 预警侧边栏通知组件 -->
  <WarningNotification />
</template>

<script setup lang="ts">
import WarningNotification from '@/components/WarningNotification.vue'

/**
 * 应用根组件
 * 智慧城市运行态势感知系统
 * 
 * 功能：
 * - 提供路由视图容器
 * - 定义全局样式
 * - 集成预警通知组件
 * - 作为应用的入口组件
 */
</script>

<style>
/* ========== 全局样式重置 ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

/* ========== 应用容器样式 ========== */
#app {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}
</style>

