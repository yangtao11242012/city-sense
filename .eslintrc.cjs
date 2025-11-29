/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    'plugin:vue/vue3-strongly-recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: '@typescript-eslint/parser'
  },
  plugins: [
    'vue',
    '@typescript-eslint'
  ],
  rules: {
    // 允许中文字符
    'no-irregular-whitespace': ['error', { skipComments: true, skipStrings: true, skipTemplates: true }],
    // 允许 console（开发调试需要）
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // 允许未使用的变量（TypeScript 会处理）
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    // Vue 相关规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    // 允许空函数（占位符函数，如 catch 回调）
    '@typescript-eslint/no-empty-function': 'off'
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.local',
    '.env',
    '*.config.js',
    '*.config.ts',
    'vite.config.ts'
  ]
}

