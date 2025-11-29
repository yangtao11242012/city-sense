/**
 * AI 服务模块
 * 封装文心一言 API 调用，提供数据分析和对话功能
 * 包含请求重试、缓存、队列管理等优化机制
 */

import axios from 'axios'
import type { CityEvent, SensorData, AIAnalysisResult } from '@/types'

// ========== API 配置 ==========
/**
 * 文心一言 API 配置
 * 请在项目根目录的 .env 文件中配置：VITE_WENXIN_API_KEY=your_api_key
 */
const API_KEY = import.meta.env.VITE_WENXIN_API_KEY || ''
const API_URL = 'https://qianfan.baidubce.com/v2/chat/completions'
const MODEL = 'ernie-3.5-8k' // 使用的模型名称

// ========== 请求队列管理 ==========
/**
 * 请求队列
 * 用于管理并发请求，避免超过API限流
 */
const requestQueue: Array<() => Promise<any>> = []
let isProcessing = false

// ========== 请求缓存 ==========
/**
 * 请求缓存
 * 键：缓存键（基于数据ID生成）
 * 值：缓存的数据和时间戳
 */
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 缓存有效期：5分钟

/**
 * 处理请求队列
 * 按顺序处理队列中的请求，避免并发过多导致限流
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return
  
  isProcessing = true
  while (requestQueue.length > 0) {
    const request = requestQueue.shift()
    if (request) {
      try {
        await request()
      } catch (error) {
        console.error('请求队列处理错误:', error)
      }
      // 延迟避免限流
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  isProcessing = false
}

/**
 * 生成缓存键
 * 基于事件和传感器ID生成唯一的缓存键
 * 
 * @param events 事件列表
 * @param sensors 传感器列表
 * @returns 缓存键字符串
 */
function generateCacheKey(events: CityEvent[], sensors: SensorData[]): string {
  const eventIds = events.map(e => e.id).sort().join(',')
  const sensorIds = sensors.map(s => s.sensorId).sort().join(',')
  return `ai_analysis_${eventIds}_${sensorIds}`
}

/**
 * 带重试机制的请求函数
 * 自动重试失败的请求，处理限流和网络错误
 * 
 * @param url API地址
 * @param data 请求数据
 * @param retries 最大重试次数，默认3次
 * @returns API响应数据
 */
async function requestWithRetry(
  url: string,
  data: any,
  retries = 3
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios({
        url,
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        data,
        timeout: 30000
      })
      return response.data
    } catch (error: any) {
      if (i === retries - 1) throw error
      
      // 如果是限流错误，等待更长时间
      if (error.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }
}

/**
 * AI 数据分析
 * 调用文心一言API分析城市事件和传感器数据，返回问题归因和处置建议
 * 
 * @param events 要分析的事件数据（可选）
 * @param sensors 要分析的传感器数据（可选）
 * @param includePatternAnalysis 是否包含模式分析（高频问题类型、问题高发区），默认false
 * @returns AI分析结果，包含问题归因、处置建议、优先级等
 * @throws 如果API调用失败或数据为空，抛出错误
 * 
 * @example
 * const result = await analyzeData(selectedEvents, selectedSensors)
 * console.log(result.analysis.cause) // 问题归因
 * console.log(result.analysis.suggestion) // 处置建议
 */
export async function analyzeData(
  events?: CityEvent[],
  sensors?: SensorData[],
  includePatternAnalysis = false
): Promise<AIAnalysisResult> {
  if (!API_KEY) {
    throw new Error('请配置 VITE_WENXIN_API_KEY 环境变量')
  }

  const eventList = events || []
  const sensorList = sensors || []

  if (eventList.length === 0 && sensorList.length === 0) {
    throw new Error('请至少选择一条数据进行分析')
  }

  // 检查缓存
  const cacheKey = generateCacheKey(eventList, sensorList)
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  // 构建 Prompt
  const prompt = buildAnalysisPrompt(eventList, sensorList, includePatternAnalysis)

  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const response = await requestWithRetry(API_URL, {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: '你是一个智慧城市运行态势分析专家，擅长分析城市事件和传感器数据，提供专业的问题归因和处置建议。'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })

        if (response.choices && response.choices.length > 0) {
          const content = response.choices[0].message?.content || ''
          const analysis = parseAnalysisResult(content, includePatternAnalysis)

          const result: AIAnalysisResult = {
            id: `analysis_${Date.now()}`,
            events: eventList.length > 0 ? eventList : undefined,
            sensors: sensorList.length > 0 ? sensorList : undefined,
            analysis,
            timestamp: new Date().toISOString()
          }

          // 缓存结果
          requestCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })

          resolve(result)
        } else if (response.error) {
          throw new Error(response.error.message || 'API 返回错误')
        } else {
          throw new Error('API 返回格式错误')
        }
      } catch (error: any) {
        const errorMessage = getErrorMessage(error)
        reject(new Error(errorMessage))
      }
    })

    processQueue()
  })
}

/**
 * AI 对话助手
 * 支持自然语言查询，结合当前数据上下文回答问题，支持上下文记忆
 * 
 * @param message 用户输入的问题
 * @param context 数据上下文（可选），包含当前的事件和传感器数据
 * @param conversationHistory 对话历史（可选），用于上下文记忆，格式：[{role: 'user'|'assistant', content: string}]
 * @returns AI回复内容
 * @throws 如果API调用失败，抛出错误
 * 
 * @example
 * // 首次提问
 * const answer1 = await chatWithAI('今天哪些区域积水最严重？', {
 *   events: allEvents,
 *   sensors: allSensors
 * })
 * 
 * // 追问（带对话历史）
 * const answer2 = await chatWithAI('怎么处理？', {
 *   events: allEvents,
 *   sensors: allSensors
 * }, [
 *   { role: 'user', content: '今天哪些区域积水最严重？' },
 *   { role: 'assistant', content: answer1 }
 * ])
 */
export async function chatWithAI(
  message: string,
  context?: { events: CityEvent[]; sensors: SensorData[] },
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  if (!API_KEY) {
    throw new Error('请配置 VITE_WENXIN_API_KEY 环境变量')
  }

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    {
      role: 'system',
      content: '你是一个智慧城市运行态势分析助手，可以帮助用户查询和分析城市运行数据。请根据用户的问题，结合提供的数据信息，给出准确、详细的回答。'
    }
  ]

  // 如果有上下文数据，构建详细的数据摘要
  if (context) {
    const events = context.events
    const sensors = context.sensors
    
    // 统计信息
    const eventTypeStats: Record<string, number> = {}
    const districtStats: Record<string, number> = {}
    const urgentEvents = events.filter(e => e.status === '紧急')
    const abnormalSensors = sensors.filter(s => s.status === '异常')
    
    events.forEach(e => {
      eventTypeStats[e.type] = (eventTypeStats[e.type] || 0) + 1
      districtStats[e.location.district] = (districtStats[e.location.district] || 0) + 1
    })
    
    sensors.forEach(s => {
      districtStats[s.location.district] = (districtStats[s.location.district] || 0) + 1
    })

    // 构建详细的数据摘要
    const dataSummary = `
当前数据概览：
- 事件总数: ${events.length}
- 传感器总数: ${sensors.length}
- 紧急事件数: ${urgentEvents.length}
- 异常设备数: ${abnormalSensors.length}

事件类型分布：
${Object.entries(eventTypeStats).map(([type, count]) => `  - ${type}: ${count}起`).join('\n')}

区域分布：
${Object.entries(districtStats).map(([district, count]) => `  - ${district}: ${count}个问题`).join('\n')}

紧急事件详情（前10条）：
${urgentEvents.slice(0, 10).map(e => `  - ${e.type} (${e.location.district} ${e.location.street}): ${e.description}`).join('\n')}

异常传感器详情（前10条）：
${abnormalSensors.slice(0, 10).map(s => `  - ${s.type} (${s.location.district} ${s.location.street}): 当前值${s.value}${s.unit}，阈值${s.threshold}${s.unit}`).join('\n')}
    `
    messages[0].content += '\n\n' + dataSummary
  }

  // 添加对话历史（用于上下文记忆）
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    })
  }

  // 添加当前用户消息
  messages.push({
    role: 'user',
    content: message
  })

  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const response = await requestWithRetry(API_URL, {
          model: MODEL,
          messages
        })

        if (response.choices && response.choices.length > 0) {
          const content = response.choices[0].message?.content || ''
          resolve(content)
        } else if (response.error) {
          throw new Error(response.error.message || 'API 返回错误')
        } else {
          throw new Error('API 返回格式错误')
        }
      } catch (error: any) {
        const errorMessage = getErrorMessage(error)
        reject(new Error(errorMessage))
      }
    })

    processQueue()
  })
}

/**
 * 全局模式分析
 * 分析所有数据，识别高频问题类型和问题高发区
 * 
 * @param events 所有事件数据
 * @param sensors 所有传感器数据
 * @returns AI分析结果，包含高频问题类型和问题高发区
 */
export async function analyzePatterns(
  events: CityEvent[],
  sensors: SensorData[]
): Promise<AIAnalysisResult> {
  if (!API_KEY) {
    throw new Error('请配置 VITE_WENXIN_API_KEY 环境变量')
  }

  if (events.length === 0 && sensors.length === 0) {
    throw new Error('没有数据可供分析')
  }

  // 先进行本地统计分析
  const typeStats: Record<string, number> = {}
  const districtStats: Record<string, Record<string, number>> = {}

  events.forEach(event => {
    // 统计问题类型
    typeStats[event.type] = (typeStats[event.type] || 0) + 1
    
    // 统计区域问题
    if (!districtStats[event.location.district]) {
      districtStats[event.location.district] = {}
    }
    districtStats[event.location.district][event.type] = 
      (districtStats[event.location.district][event.type] || 0) + 1
  })

  sensors.filter(s => s.status === '异常').forEach(sensor => {
    typeStats[sensor.type] = (typeStats[sensor.type] || 0) + 1
    
    if (!districtStats[sensor.location.district]) {
      districtStats[sensor.location.district] = {}
    }
    districtStats[sensor.location.district][sensor.type] = 
      (districtStats[sensor.location.district][sensor.type] || 0) + 1
  })

  const totalCount = events.length + sensors.filter(s => s.status === '异常').length

  // 计算高频问题类型（前5名）
  const frequentTypes = Object.entries(typeStats)
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / totalCount) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 计算问题高发区
  const hotspots = Object.entries(districtStats)
    .map(([district, types]) => {
      const totalProblems = Object.values(types).reduce((sum, count) => sum + count, 0)
      const problemTypes = Object.entries(types)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type)
      
      let severity: 'high' | 'medium' | 'low' = 'low'
      if (totalProblems >= 10) severity = 'high'
      else if (totalProblems >= 5) severity = 'medium'

      return {
        district,
        problemTypes,
        count: totalProblems,
        severity
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 构建Prompt，让AI进行深度分析
  const prompt = buildPatternAnalysisPrompt(events, sensors, frequentTypes, hotspots)

  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const response = await requestWithRetry(API_URL, {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: '你是一个智慧城市运行态势分析专家，擅长识别城市问题模式和热点区域。'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })

        if (response.choices && response.choices.length > 0) {
          const content = response.choices[0].message?.content || ''
          const patternAnalysis = parsePatternAnalysisResult(content)

          const result: AIAnalysisResult = {
            id: `pattern_analysis_${Date.now()}`,
            events: events.length > 0 ? events : undefined,
            sensors: sensors.length > 0 ? sensors : undefined,
            analysis: {
              cause: patternAnalysis.summary || '基于数据分析发现的问题模式',
              suggestion: patternAnalysis.suggestions || '建议重点关注高频问题类型和高发区域',
              priority: 'high',
              frequentProblemTypes: frequentTypes,
              problemHotspots: hotspots
            },
            timestamp: new Date().toISOString()
          }

          resolve(result)
        } else if (response.error) {
          throw new Error(response.error.message || 'API 返回错误')
        } else {
          throw new Error('API 返回格式错误')
        }
      } catch (error: any) {
        const errorMessage = getErrorMessage(error)
        reject(new Error(errorMessage))
      }
    })

    processQueue()
  })
}

/**
 * 构建模式分析Prompt
 */
function buildPatternAnalysisPrompt(
  events: CityEvent[],
  sensors: SensorData[],
  frequentTypes: Array<{ type: string; count: number; percentage: number }>,
  hotspots: Array<{ district: string; problemTypes: string[]; count: number; severity: string }>
): string {
  const prompt = `请分析以下城市运行数据，识别问题模式和热点区域：

【数据统计】
- 事件总数：${events.length}
- 异常传感器数：${sensors.filter(s => s.status === '异常').length}

【高频问题类型】
${frequentTypes.map(t => `- ${t.type}: ${t.count}次 (${t.percentage}%)`).join('\n')}

【问题高发区】
${hotspots.map(h => `- ${h.district}: ${h.count}个问题，主要类型：${h.problemTypes.join('、')}，严重程度：${h.severity === 'high' ? '高' : h.severity === 'medium' ? '中' : '低'}`).join('\n')}

请返回JSON格式的分析结果：
{
  "summary": "问题模式总结（分析这些高频问题类型和高发区的共同特征和原因）",
  "suggestions": "针对性建议（针对高频问题类型和高发区提出具体的治理建议）"
}

请只返回JSON，不要包含其他文字。`

  return prompt
}

/**
 * 解析模式分析结果
 */
function parsePatternAnalysisResult(content: string): {
  summary: string
  suggestions: string
} {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || '已识别高频问题类型和问题高发区',
        suggestions: parsed.suggestions || '建议重点关注高频问题类型和高发区域'
      }
    }
  } catch (error) {
    console.error('解析模式分析结果失败:', error)
  }

  return {
    summary: content.substring(0, 200) || '已识别高频问题类型和问题高发区',
    suggestions: '建议重点关注高频问题类型和高发区域'
  }
}

/**
 * 构建AI分析Prompt
 * 将事件和传感器数据格式化为结构化的Prompt，指导AI进行分析
 * 对多条数据进行摘要处理，避免数据量过大
 * 
 * @param events 事件数据列表
 * @param sensors 传感器数据列表
 * @param includePatternAnalysis 是否包含模式分析
 * @returns 格式化的Prompt字符串
 */
function buildAnalysisPrompt(events: CityEvent[], sensors: SensorData[], includePatternAnalysis = false): string {
  let prompt = '你是一个智慧城市运行态势分析专家。请分析以下数据：\n\n'

  // 限制数据量，如果数据太多则进行摘要
  const MAX_ITEMS = 10 // 最多分析10条数据
  
  if (events.length > 0) {
    prompt += `【事件数据】共 ${events.length} 条\n`
    const eventsToAnalyze = events.slice(0, MAX_ITEMS)
    
    // 构建简化的事件数据（只包含关键信息）
    const simplifiedEvents = eventsToAnalyze.map(e => ({
      id: e.id,
      type: e.type,
      description: e.description,
      location: `${e.location.district} ${e.location.street}`,
      reportTime: e.reportTime,
      status: e.status
    }))
    
    prompt += JSON.stringify(simplifiedEvents, null, 2)
    
    if (events.length > MAX_ITEMS) {
      prompt += `\n\n（注：还有 ${events.length - MAX_ITEMS} 条事件未列出，请在分析时考虑整体情况）`
    }
    prompt += '\n\n'
  }

  if (sensors.length > 0) {
    prompt += `【传感器数据】共 ${sensors.length} 条\n`
    const sensorsToAnalyze = sensors.slice(0, MAX_ITEMS)
    
    // 构建简化的传感器数据（只包含关键信息）
    const simplifiedSensors = sensorsToAnalyze.map(s => ({
      sensorId: s.sensorId,
      type: s.type,
      value: s.value,
      unit: s.unit,
      threshold: s.threshold,
      location: `${s.location.district} ${s.location.street}`,
      timestamp: s.timestamp,
      status: s.status
    }))
    
    prompt += JSON.stringify(simplifiedSensors, null, 2)
    
    if (sensors.length > MAX_ITEMS) {
      prompt += `\n\n（注：还有 ${sensors.length - MAX_ITEMS} 条传感器数据未列出，请在分析时考虑整体情况）`
    }
    prompt += '\n\n'
  }

  if (includePatternAnalysis && events.length + sensors.length > 5) {
    // 如果数据量较大，添加模式分析要求
    prompt += `\n\n【额外分析要求】
请识别：
1. 高频问题类型（出现次数最多的问题类型）
2. 问题高发区（问题集中的地理区域）

请按照以下格式返回分析结果（必须使用JSON格式，不要包含任何其他文字）：
{
  "cause": "问题归因分析（详细分析这些数据反映的问题原因）",
  "suggestion": "处置建议（提供具体的处置措施和建议）",
  "priority": "high|medium|low",
  "estimatedTime": "预计处理时间（如：2小时、1天等）",
  "frequentProblemTypes": [{"type": "问题类型", "count": 数量, "percentage": 百分比}],
  "problemHotspots": [{"district": "区域", "problemTypes": ["类型1", "类型2"], "count": 数量, "severity": "high|medium|low"}]
}

重要：请只返回JSON对象，不要包含任何其他文字、说明或markdown格式。`
  } else {
    prompt += `请按照以下格式返回分析结果（必须使用JSON格式，不要包含任何其他文字）：
{
  "cause": "问题归因分析（详细分析这些数据反映的问题原因）",
  "suggestion": "处置建议（提供具体的处置措施和建议）",
  "priority": "high|medium|low",
  "estimatedTime": "预计处理时间（如：2小时、1天等）"
}

重要：请只返回JSON对象，不要包含任何其他文字、说明或markdown格式。`
  }

  return prompt
}

/**
 * 解析AI分析结果
 * 从AI返回的文本中提取结构化的分析结果
 * 支持JSON格式和文本格式的解析，增强错误处理和日志
 * 
 * @param content AI返回的原始内容
 * @param includePatternAnalysis 是否包含模式分析
 * @returns 解析后的结构化分析结果
 */
function parseAnalysisResult(content: string, _includePatternAnalysis = false): {
  cause: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
  estimatedTime?: string
  frequentProblemTypes?: Array<{ type: string; count: number; percentage: number }>
  problemHotspots?: Array<{ district: string; problemTypes: string[]; count: number; severity: 'high' | 'medium' | 'low' }>
} {
  // 记录原始内容用于调试
  console.log('AI返回的原始内容:', content)
  
  if (!content || content.trim().length === 0) {
    console.warn('AI返回内容为空')
    return {
      cause: 'AI未返回分析结果，请重试',
      suggestion: '请重新进行AI分析',
      priority: 'medium'
    }
  }

  try {
    // 方法1: 尝试直接解析整个内容为JSON
    try {
      const directParsed = JSON.parse(content.trim())
      if (directParsed.cause || directParsed.suggestion) {
        return {
          cause: directParsed.cause || '未提供归因',
          suggestion: directParsed.suggestion || '未提供建议',
          priority: directParsed.priority || 'medium',
          estimatedTime: directParsed.estimatedTime,
          frequentProblemTypes: directParsed.frequentProblemTypes,
          problemHotspots: directParsed.problemHotspots
        }
      }
    } catch (e) {
      // 直接解析失败，继续尝试其他方法
    }

    // 方法2: 尝试提取JSON对象（支持markdown代码块）
    // 移除可能的markdown代码块标记
    const jsonContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    // 尝试匹配JSON对象
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          cause: parsed.cause || '未提供归因',
          suggestion: parsed.suggestion || '未提供建议',
          priority: parsed.priority || 'medium',
          estimatedTime: parsed.estimatedTime,
          frequentProblemTypes: parsed.frequentProblemTypes,
          problemHotspots: parsed.problemHotspots
        }
      } catch (e) {
        console.error('解析提取的JSON失败:', e, 'JSON内容:', jsonMatch[0])
      }
    }
  } catch (error) {
    console.error('解析JSON失败:', error)
  }

  // 方法3: 如果JSON解析失败，尝试从文本中提取
  const causeMatch = content.match(/问题归因[：:]\s*(.+?)(?:\n|处置建议|$)/i) || 
                     content.match(/cause[：:]\s*(.+?)(?:\n|suggestion|$)/i) ||
                     content.match(/归因[：:]\s*(.+?)(?:\n|建议|$)/i)
  
  const suggestionMatch = content.match(/处置建议[：:]\s*(.+?)(?:\n|优先级|$)/i) ||
                          content.match(/suggestion[：:]\s*(.+?)(?:\n|priority|$)/i) ||
                          content.match(/建议[：:]\s*(.+?)(?:\n|优先级|$)/i)
  
  const priorityMatch = content.match(/优先级[：:]\s*(高|中|低|high|medium|low)/i) ||
                        content.match(/priority[：:]\s*(高|中|低|high|medium|low)/i)

  const cause = causeMatch ? causeMatch[1].trim() : (content.length > 0 ? content.substring(0, 200) : '未提供归因')
  const suggestion = suggestionMatch ? suggestionMatch[1].trim() : '未提供建议'
  
  let priority: 'high' | 'medium' | 'low' = 'medium'
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase()
    if (p.includes('高') || p === 'high') {
      priority = 'high'
    } else if (p.includes('低') || p === 'low') {
      priority = 'low'
    }
  }

  const estimatedTime = content.match(/预计处理时间[：:]\s*(.+?)(?:\n|$)/i)?.[1]?.trim() ||
                        content.match(/estimatedTime[：:]\s*(.+?)(?:\n|$)/i)?.[1]?.trim()

  return {
    cause,
    suggestion,
    priority,
    estimatedTime
  }
}

/**
 * 获取友好的错误信息
 * 将API错误转换为用户友好的中文错误提示
 * 
 * @param error 错误对象
 * @returns 错误信息字符串
 */
function getErrorMessage(error: any): string {
  if (error.response) {
    const status = error.response.status
    const errorData = error.response.data

    if (errorData?.error?.message) {
      return errorData.error.message
    } else if (status === 401) {
      return '认证失败，请检查 API Key 是否正确'
    } else if (status === 403) {
      return '权限不足，请检查 API Key 权限'
    } else if (status === 429) {
      return '请求频率过高，请稍后再试'
    } else {
      return `请求失败 (${status}): ${errorData?.error?.code || error.message}`
    }
  } else if (error.request) {
    return '网络请求失败，请检查网络连接'
  } else {
    return error.message || '未知错误'
  }
}

