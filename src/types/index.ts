/**
 * 类型定义文件
 * 定义应用中使用的所有 TypeScript 接口和类型
 */

/**
 * 位置信息接口
 * 用于描述地理位置信息
 */
export interface Location {
  /** 区县名称，如：朝阳区 */
  district: string
  /** 街道名称，如：建国路 */
  street: string
  /** 纬度（WGS84坐标系） */
  lat: number
  /** 经度（WGS84坐标系） */
  lng: number
}

/**
 * 城市事件接口
 * 表示城市运行中发生的各种事件
 */
export interface CityEvent {
  /** 事件唯一标识符 */
  id: string
  /** 事件类型，如：道路积水、路灯故障、占道经营等 */
  type: string
  /** 事件详细描述 */
  description: string
  /** 事件发生位置 */
  location: Location
  /** 上报时间（ISO 8601格式，如：2025-11-12T08:30:00） */
  reportTime: string
  /** 上报来源，如：市民APP、网格员、城管巡查、12345热线等 */
  reporterType: string
  /** 事件处理状态，如：未处理、已派单、处理中、紧急等 */
  status: string
}

/**
 * 传感器数据接口
 * 表示物联网传感器采集的数据
 */
export interface SensorData {
  /** 传感器唯一标识符 */
  sensorId: string
  /** 传感器类型，如：积水监测、路灯电流、PM2.5监测等 */
  type: string
  /** 传感器安装位置 */
  location: Location
  /** 传感器采集的数值 */
  value: number
  /** 数值单位，如：cm、A、μg/m³、dB、%等 */
  unit: string
  /** 异常阈值，超过此值视为异常 */
  threshold: number
  /** 数据采集时间戳（ISO 8601格式） */
  timestamp: string
  /** 传感器状态：正常、异常 */
  status: string
}

/**
 * 数据验证结果接口
 * 用于返回数据验证的结果和错误信息
 */
export interface ValidationResult {
  /** 验证是否通过 */
  valid: boolean
  /** 错误信息列表（如果验证失败） */
  errors: string[]
}

/**
 * 统计数据接口
 * 包含各种统计指标和分布数据
 */
export interface Statistics {
  /** 事件总数 */
  totalEvents: number
  /** 传感器总数 */
  totalSensors: number
  /** 异常设备数量 */
  abnormalSensors: number
  /** 事件类型分布，键为类型名称，值为数量 */
  eventTypeDistribution: Record<string, number>
  /** 传感器类型分布，键为类型名称，值为数量 */
  sensorTypeDistribution: Record<string, number>
  /** 区域分布，键为区县名称，值为数量 */
  districtDistribution: Record<string, number>
  /** 时间序列数据，用于趋势分析 */
  timeSeriesData: TimeSeriesPoint[]
}

/**
 * 时间序列数据点接口
 * 用于表示某个时间点的数据值
 */
export interface TimeSeriesPoint {
  /** 时间点（格式：YYYY-MM-DD） */
  time: string
  /** 该时间点的数值 */
  value: number
  /** 数据类型（可选） */
  type?: string
}

/**
 * 预警信息接口
 * 表示系统自动生成的预警信息
 */
export interface Warning {
  /** 预警唯一标识符 */
  id: string
  /** 预警类型：事件预警、传感器预警、关联预警 */
  type: 'event' | 'sensor' | 'correlation'
  /** 预警级别：高、中、低 */
  level: 'high' | 'medium' | 'low'
  /** 预警标题 */
  title: string
  /** 预警详细描述 */
  description: string
  /** 预警位置信息 */
  location: Location
  /** 关联的事件ID列表（可选） */
  relatedEvents?: string[]
  /** 关联的传感器ID列表（可选） */
  relatedSensors?: string[]
  /** 预警生成时间 */
  timestamp: string
  /** 预警处理状态：待处理、处理中、已解决 */
  status: 'pending' | 'processing' | 'resolved'
  /** AI生成的处置建议（可选） */
  aiSuggestion?: string
}

/**
 * AI分析结果接口
 * 表示AI对数据进行分析后返回的结果
 */
export interface AIAnalysisResult {
  /** 分析结果唯一标识符 */
  id: string
  /** 分析的事件数据（可选） */
  events?: CityEvent[]
  /** 分析的传感器数据（可选） */
  sensors?: SensorData[]
  /** AI分析内容 */
  analysis: {
    /** 问题归因分析 */
    cause: string
    /** 处置建议 */
    suggestion: string
    /** 优先级：高、中、低 */
    priority: 'high' | 'medium' | 'low'
    /** 预计处理时间（可选） */
    estimatedTime?: string
    /** 高频问题类型（可选） */
    frequentProblemTypes?: Array<{
      type: string
      count: number
      percentage: number
    }>
    /** 问题高发区（可选） */
    problemHotspots?: Array<{
      district: string
      problemTypes: string[]
      count: number
      severity: 'high' | 'medium' | 'low'
    }>
  }
  /** 分析时间戳 */
  timestamp: string
}

