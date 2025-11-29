/**
 * 地理位置工具函数
 * 提供地理位置相关的计算功能，如距离计算、关联分析等
 */

import type { Location } from '@/types'

/**
 * 计算两个地理位置之间的距离（单位：米）
 * 使用 Haversine 公式计算地球表面两点间的大圆距离
 * 
 * @param loc1 第一个位置
 * @param loc2 第二个位置
 * @returns 距离（米）
 * 
 * @example
 * const distance = calculateDistance(
 *   { lat: 39.9087, lng: 116.4075, district: '朝阳区', street: '建国路' },
 *   { lat: 39.9142, lng: 116.4156, district: '东城区', street: '王府井大街' }
 * )
 * console.log(distance) // 约 800 米
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371000 // 地球半径（米）
  const lat1Rad = (loc1.lat * Math.PI) / 180
  const lat2Rad = (loc2.lat * Math.PI) / 180
  const deltaLatRad = ((loc2.lat - loc1.lat) * Math.PI) / 180
  const deltaLngRad = ((loc2.lng - loc1.lng) * Math.PI) / 180

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

/**
 * 判断两个位置是否在指定距离范围内
 * 
 * @param loc1 第一个位置
 * @param loc2 第二个位置
 * @param maxDistance 最大距离（米），默认500米
 * @returns 是否在范围内
 */
export function isWithinDistance(
  loc1: Location,
  loc2: Location,
  maxDistance = 500
): boolean {
  return calculateDistance(loc1, loc2) <= maxDistance
}

