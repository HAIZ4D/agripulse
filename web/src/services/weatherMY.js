const BASE_URL = 'https://api.data.gov.my/weather'

// Simple in-memory cache to avoid hitting rate limits
const cache = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function fetchWithRetry(url, retries = 3) {
  // Check cache first
  const cached = cache.get(url)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data
  }

  for (let i = 0; i < retries; i++) {
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      cache.set(url, { data, time: Date.now() })
      return data
    }
    if (res.status === 429 && i < retries - 1) {
      // Wait before retry: 2s, 4s
      await new Promise((r) => setTimeout(r, (i + 1) * 2000))
      continue
    }
    throw new Error(`Weather API error: ${res.status}`)
  }
}

export async function fetchForecast(areaName) {
  // Extract district name (before comma) for better matching
  const district = areaName?.split(',')[0]?.trim()
  if (!district) return []
  return fetchWithRetry(
    `${BASE_URL}/forecast?contains=${encodeURIComponent(district)}@location__location_name`
  )
}

export async function fetchWarnings() {
  return fetchWithRetry(`${BASE_URL}/warning`)
}

export async function fetchEarthquakeWarnings() {
  return fetchWithRetry(`${BASE_URL}/warning/earthquake`)
}
