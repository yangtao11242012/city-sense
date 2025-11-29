/**
 * 城市运行简报生成服务
 * 使用AI生成当日城市运行简报，包含问题汇总、热点区域、处置建议、预警回顾
 */

import { chatWithAI } from './ai'
import type { CityEvent, SensorData } from '@/types'
import dayjs from 'dayjs'

export interface DailyReport {
  date: string
  problemSummary: string
  hotspotAreas: string
  suggestions: string
  warningReview: string
  generatedAt: string
}

/**
 * 生成当日城市运行简报
 * @param events 事件数据
 * @param sensors 传感器数据
 * @param warnings 预警列表（可选）
 * @returns 生成的简报内容
 */
export async function generateDailyReport(
  events: CityEvent[],
  sensors: SensorData[],
  warnings?: Array<{ title: string; description: string; level: string; location: { district: string; street: string } }>
): Promise<DailyReport> {
  const today = dayjs().format('YYYY-MM-DD')
  
  // 统计数据
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

  // 构建数据摘要
  const dataSummary = `
【数据统计】
- 事件总数: ${events.length}
- 传感器总数: ${sensors.length}
- 紧急事件数: ${urgentEvents.length}
- 异常设备数: ${abnormalSensors.length}

【事件类型分布】
${Object.entries(eventTypeStats).map(([type, count]) => `  - ${type}: ${count}起`).join('\n')}

【区域问题分布】
${Object.entries(districtStats).map(([district, count]) => `  - ${district}: ${count}个问题`).join('\n')}

【紧急事件详情（前10条）】
${urgentEvents.slice(0, 10).map(e => `  - ${e.type} (${e.location.district} ${e.location.street}): ${e.description}`).join('\n')}

【异常传感器详情（前10条）】
${abnormalSensors.slice(0, 10).map(s => `  - ${s.type} (${s.location.district} ${s.location.street}): 当前值${s.value}${s.unit}，阈值${s.threshold}${s.unit}`).join('\n')}
  `

  // 预警信息
  const warningInfo = warnings && warnings.length > 0
    ? `【预警信息】
${warnings.slice(0, 10).map(w => `  - ${w.title} (${w.level}优先级): ${w.description} - 位置: ${w.location.district} ${w.location.street}`).join('\n')}`
    : '【预警信息】\n  今日暂无预警信息'

  // 构建Prompt
  const prompt = `请根据以下${today}的城市运行数据，生成一份专业的《城市运行简报》。

${dataSummary}

${warningInfo}

请按照以下格式生成简报，要求：
1. **问题汇总**：总结今日主要问题类型、数量、严重程度
2. **热点区域**：识别问题集中的区域，说明主要问题类型和数量
3. **处置建议**：针对发现的问题，提供具体的处置建议和措施
4. **预警回顾**：总结今日预警情况，分析预警原因和应对措施

请返回JSON格式：
{
  "problemSummary": "问题汇总内容（详细描述今日主要问题）",
  "hotspotAreas": "热点区域分析（说明哪些区域问题集中，原因分析）",
  "suggestions": "处置建议（提供具体的处置措施和建议）",
  "warningReview": "预警回顾（总结预警情况，分析原因和应对措施）"
}

请只返回JSON，不要包含其他文字或markdown格式。`

  try {
    const response = await chatWithAI(prompt, { events, sensors })
    
    // 解析JSON响应
    let reportData: {
      problemSummary: string
      hotspotAreas: string
      suggestions: string
      warningReview: string
    }

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('无法解析JSON')
      }
    } catch (e) {
      // 如果解析失败，尝试从文本中提取
      const lines = response.split('\n')
      reportData = {
        problemSummary: extractSection(lines, '问题汇总') || '今日数据统计完成，发现多个城市运行问题需要关注。',
        hotspotAreas: extractSection(lines, '热点区域') || '需要进一步分析区域分布情况。',
        suggestions: extractSection(lines, '处置建议') || '建议加强日常巡查和及时响应。',
        warningReview: extractSection(lines, '预警回顾') || warnings && warnings.length > 0 ? '今日有预警信息，需要及时处理。' : '今日暂无预警信息。'
      }
    }

    return {
      date: today,
      problemSummary: reportData.problemSummary,
      hotspotAreas: reportData.hotspotAreas,
      suggestions: reportData.suggestions,
      warningReview: reportData.warningReview,
      generatedAt: new Date().toISOString()
    }
  } catch (error: any) {
    // 如果AI生成失败，返回基于统计的默认简报
    return {
      date: today,
      problemSummary: `今日共发现${events.length}起事件，${abnormalSensors.length}个异常传感器。主要问题类型：${Object.entries(eventTypeStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type]) => type).join('、')}。`,
      hotspotAreas: `问题主要集中在以下区域：${Object.entries(districtStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([district]) => district).join('、')}。`,
      suggestions: '建议加强日常巡查，及时响应紧急事件，对异常传感器进行检修维护。',
      warningReview: warnings && warnings.length > 0 ? `今日共产生${warnings.length}条预警，需要及时关注和处理。` : '今日暂无预警信息。',
      generatedAt: new Date().toISOString()
    }
  }
}

/**
 * 从文本中提取指定部分的内容
 */
function extractSection(lines: string[], sectionName: string): string | null {
  let inSection = false
  const sectionLines: string[] = []
  
  for (const line of lines) {
    if (line.includes(sectionName) || line.includes(sectionName.replace('汇总', '').replace('回顾', ''))) {
      inSection = true
      continue
    }
    if (inSection) {
      if (line.trim() === '' || line.match(/^[#*]/)) {
        if (sectionLines.length > 0) break
        continue
      }
      sectionLines.push(line.trim())
    }
  }
  
  return sectionLines.length > 0 ? sectionLines.join('\n') : null
}

