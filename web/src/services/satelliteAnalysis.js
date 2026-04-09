/**
 * satelliteAnalysis.js
 *
 * Client-side satellite analysis service.
 * 
 * TWO modes:
 *   1. Cloud Function mode (preferred): Calls the deployed httpSatelliteReport
 *      Cloud Function which handles GEE auth automatically via Firebase service account.
 *   2. Direct GEE mode (fallback): Uses a user-provided GEE OAuth2 token
 *      for live client-side analysis with zone generation.
 *
 * The Cloud Function mode requires no manual token — it just works.
 */

import * as turf from '@turf/turf'
import { fetchNDVI, fetchNDWI, fetchNDRE } from './earthEngine'
import { doc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const ZONE_CELL_SIZE_KM = 0.02    // 20m × 20m
const MIN_ZONE_AREA_SQM = 50

// ─── Cloud Function Mode ──────────────────────────────────────────────────────

/**
 * Trigger the Cloud Function to regenerate satellite reports for ALL farmers.
 * The function uses Firebase ADC — no manual token needed.
 * After it completes, the Firestore subscription will auto-update the UI.
 */
export async function triggerCloudAnalysis(onProgress = () => {}) {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  // Allow explicit URL override via env var (handles Gen2 Cloud Run URLs)
  const customUrl = import.meta.env.VITE_SATELLITE_FUNCTION_URL

  // Build list of URLs to try (Gen2 Cloud Run format, then Gen1)
  const urls = []
  if (customUrl) urls.push(customUrl)
  urls.push(`https://asia-southeast1-${projectId}.cloudfunctions.net/httpSatelliteReport`)

  onProgress('Triggering satellite analysis on server...', 10)

  let lastError = null
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`Server returned ${response.status}: ${errText.slice(0, 200)}`)
      }

      const result = await response.json()
      onProgress(`Complete! ${result.processed || 0} farm(s) analyzed.`, 100)
      return result
    } catch (err) {
      lastError = err
      console.warn(`URL ${url} failed:`, err.message)
      continue
    }
  }

  // If all URLs failed
  if (lastError?.message?.includes('Failed to fetch') || lastError?.message?.includes('NetworkError') || lastError?.message?.includes('CORS')) {
    throw new Error(
      'Could not reach the Cloud Function. This is normal if it hasn\'t been deployed yet.\n' +
      'Falling back to direct satellite analysis...'
    )
  }
  throw lastError
}

// ─── Zone Generation (turf.js) ───────────────────────────────────────────────

function normalizeBoundary(boundary) {
  let coords = boundary?.coordinates || boundary
  if (typeof coords === 'string') {
    try { coords = JSON.parse(coords) } catch (_) {}
  }
  if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
    coords = [coords]
  }
  return coords
}

export function generateFarmZones(boundary) {
  try {
    const coords = normalizeBoundary(boundary)
    if (!coords) return []

    const geom = { type: 'Polygon', coordinates: coords }
    const farmFeature = turf.feature(geom)
    const bbox = turf.bbox(farmFeature)

    const grid = turf.squareGrid(bbox, ZONE_CELL_SIZE_KM, { units: 'kilometers' })
    const zones = []
    let idx = 0

    for (const cell of grid.features) {
      try {
        const intersection = turf.intersect(turf.featureCollection([farmFeature, cell]))
        if (!intersection) continue

        const areaSqM = turf.area(intersection)
        if (areaSqM < MIN_ZONE_AREA_SQM) continue

        const centroid = turf.centroid(intersection)
        let zoneCoords = intersection.geometry.coordinates
        if (intersection.geometry.type === 'MultiPolygon') {
          zoneCoords = zoneCoords.reduce((best, ring) => {
            const a = turf.area(turf.polygon(ring))
            const b = best ? turf.area(turf.polygon(best)) : 0
            return a > b ? ring : best
          }, null)
        }

        zones.push({
          zone_id: `z_${idx}`,
          coordinates: zoneCoords,
          center: centroid.geometry.coordinates,
          area_sqm: Math.round(areaSqM),
        })
        idx++
      } catch (_) {}
    }

    return zones
  } catch (err) {
    console.error('Zone generation failed:', err)
    return []
  }
}

// ─── Zone Classification ──────────────────────────────────────────────────────

function classifyZone(ndvi, ndwi, ndre) {
  if (ndvi !== null && ndvi < 0.15) return { classification: 'critical', action_needed: 'inspect' }
  if (ndwi !== null && ndwi < -0.35) return { classification: 'critical', action_needed: 'irrigate' }
  if (ndre !== null && ndre < 0.18) return { classification: 'critical', action_needed: 'fertilize' }
  if (ndvi !== null && ndvi < 0.30) return { classification: 'moderate', action_needed: 'monitor' }
  if (ndwi !== null && ndwi < -0.20) return { classification: 'moderate', action_needed: 'irrigate' }
  if (ndre !== null && ndre < 0.28) return { classification: 'moderate', action_needed: 'fertilize' }
  if (ndvi !== null && ndvi >= 0.45) return { classification: 'healthy', action_needed: null }
  return { classification: 'moderate', action_needed: 'monitor' }
}

function detectChange(current, previous) {
  if (current === null || previous === null) return { change_ndvi: null, change_trend: 'new' }
  const delta = current - previous
  return {
    change_ndvi: parseFloat(delta.toFixed(4)),
    change_trend: delta > 0.05 ? 'improving' : delta < -0.05 ? 'declining' : 'stable',
  }
}

function calculateHealthScore(ndviAvg) {
  if (ndviAvg === null || ndviAvg === undefined || isNaN(ndviAvg)) return null
  const clamped = Math.max(-0.1, Math.min(1.0, ndviAvg))
  return Math.round(Math.max(0, Math.min(100, ((clamped + 0.1) / 1.1) * 100)))
}

// ─── Direct GEE Mode (fallback) ─────────────────────────────────────────────

/**
 * Run full satellite analysis from the browser using a GEE access token.
 * Generates zones, fetches NDVI/NDWI/NDRE per zone, classifies, and writes to Firestore.
 */
export async function runDirectAnalysis({
  boundary, projectId, accessToken,
  farmerId, farmIndex, farm,
  onProgress = () => {},
}) {
  const coords = normalizeBoundary(boundary)
  if (!coords) throw new Error('Invalid farm boundary')
  const boundaryForGee = { coordinates: coords }

  onProgress('Generating micro-zones...', 5)
  const zones = generateFarmZones(boundary)
  onProgress(`Generated ${zones.length} zones`, 10)

  onProgress('Fetching farm-wide NDVI, NDWI, NDRE...', 15)
  const [farmNdvi, farmNdwi, farmNdre] = await Promise.all([
    fetchNDVI(boundaryForGee, projectId, accessToken),
    fetchNDWI(boundaryForGee, projectId, accessToken),
    fetchNDRE(boundaryForGee, projectId, accessToken),
  ])
  onProgress(`Farm averages: NDVI=${farmNdvi?.toFixed(3)}, NDWI=${farmNdwi?.toFixed(3)}, NDRE=${farmNdre?.toFixed(3)}`, 30)

  const enrichedZones = []
  const batchSize = 3
  for (let i = 0; i < zones.length; i += batchSize) {
    const batch = zones.slice(i, i + batchSize)
    const pctBase = 30 + Math.round((i / zones.length) * 50)
    onProgress(`Analyzing zone ${i + 1}–${Math.min(i + batchSize, zones.length)} of ${zones.length}...`, pctBase)

    const results = await Promise.all(
      batch.map(async (zone) => {
        const zBoundary = { coordinates: zone.coordinates }
        try {
          const [ndvi, ndwi, ndre] = await Promise.all([
            fetchNDVI(zBoundary, projectId, accessToken),
            fetchNDWI(zBoundary, projectId, accessToken),
            fetchNDRE(zBoundary, projectId, accessToken),
          ])
          const { classification, action_needed } = classifyZone(ndvi, ndwi, ndre)
          return {
            ...zone,
            ndvi: ndvi !== null ? parseFloat(ndvi.toFixed(4)) : null,
            ndwi: ndwi !== null ? parseFloat(ndwi.toFixed(4)) : null,
            ndre: ndre !== null ? parseFloat(ndre.toFixed(4)) : null,
            classification, action_needed,
            change_ndvi: null, change_trend: 'new',
          }
        } catch (err) {
          console.warn(`Zone ${zone.zone_id} failed:`, err.message)
          return {
            ...zone, ndvi: null, ndwi: null, ndre: null,
            classification: 'moderate', action_needed: 'monitor',
            change_ndvi: null, change_trend: 'new',
          }
        }
      })
    )
    enrichedZones.push(...results)
  }

  // Change detection
  onProgress('Comparing with previous scan...', 85)
  try {
    const prevRef = collection(db, 'satellite_reports', farmerId, `${farmIndex}`)
    const prevQ = query(prevRef, orderBy('generated_at', 'desc'), limit(1))
    const prevSnap = await getDocs(prevQ)
    if (!prevSnap.empty) {
      const prevZones = prevSnap.docs[0].data().zones || []
      const prevMap = {}
      prevZones.forEach((z) => { prevMap[z.zone_id] = z })
      for (const zone of enrichedZones) {
        const prev = prevMap[zone.zone_id]
        if (prev) {
          const { change_ndvi, change_trend } = detectChange(zone.ndvi, prev.ndvi)
          zone.change_ndvi = change_ndvi
          zone.change_trend = change_trend
        }
      }
    }
  } catch (_) {}

  // Compute stats
  const healthyCount = enrichedZones.filter((z) => z.classification === 'healthy').length
  const moderateCount = enrichedZones.filter((z) => z.classification === 'moderate').length
  const criticalCount = enrichedZones.filter((z) => z.classification === 'critical').length
  const zonesImproved = enrichedZones.filter((z) => z.change_trend === 'improving').length
  const zonesDeclined = enrichedZones.filter((z) => z.change_trend === 'declining').length
  const zonesStable = enrichedZones.filter((z) => z.change_trend === 'stable').length
  const zonesCriticalNew = enrichedZones.filter(
    (z) => z.change_trend !== 'new' && z.classification === 'critical'
  ).length

  let overallTrend = 'stable'
  if (zonesImproved > zonesDeclined) overallTrend = 'improving'
  else if (zonesDeclined > zonesImproved) overallTrend = 'declining'

  const healthScore = calculateHealthScore(farmNdvi)
  const alerts = []
  if (farmNdvi !== null && farmNdvi < 0.2) alerts.push({ zone: 'overall', severity: 'critical', message: 'Very low vegetation. Possible crop failure or bare soil.' })
  else if (farmNdvi !== null && farmNdvi < 0.4) alerts.push({ zone: 'overall', severity: 'warning', message: 'Below-average vegetation health.' })
  if (farmNdwi !== null && farmNdwi < -0.1) alerts.push({ zone: 'overall', severity: 'warning', message: 'Low water content. Irrigation may be needed.' })
  if (criticalCount > 0) alerts.push({ zone: 'zones', severity: 'critical', message: `${criticalCount} zone(s) critical.` })

  const reportDate = new Date().toISOString().split('T')[0]
  const report = {
    ndvi_average: farmNdvi, ndwi_average: farmNdwi, ndre_average: farmNdre,
    health_score: healthScore,
    zones: enrichedZones,
    zone_stats: { total_zones: enrichedZones.length, healthy_count: healthyCount, moderate_count: moderateCount, critical_count: criticalCount },
    change_detection: { zones_improved: zonesImproved, zones_declined: zonesDeclined, zones_stable: zonesStable, zones_critical_new: zonesCriticalNew, overall_trend: overallTrend },
    composite_days: 30, data_quality: 'composite',
    alerts,
    current_crops: farm?.current_crops || [],
    farm_name: farm?.name || `Farm ${farmIndex + 1}`,
    area_hectares: farm?.area_hectares || null,
    generated_at: serverTimestamp(),
  }

  onProgress('Saving report to database...', 95)
  const reportRef = doc(db, 'satellite_reports', farmerId, `${farmIndex}`, reportDate)
  await setDoc(reportRef, report)

  onProgress('Analysis complete!', 100)
  return { id: reportDate, ...report }
}
