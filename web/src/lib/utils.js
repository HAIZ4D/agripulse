import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the district name from an area string.
 * "Serdang, Selangor" → "Serdang"
 * "Serdang" → "Serdang"
 */
export function getDistrict(areaName) {
  if (!areaName) return ''
  return areaName.split(',')[0].trim()
}
