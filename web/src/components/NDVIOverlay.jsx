import { useTranslation } from 'react-i18next'
import { GoogleMap, Polygon, GroundOverlay } from '@react-google-maps/api'
import { Satellite, Loader2, Maximize2, Leaf, Droplets, FlaskConical } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useGoogleMaps } from '../lib/mapsLoader'

const mapContainerStyle = { width: '100%', height: '100%', minHeight: '400px', flex: 1, borderRadius: '0 0 0.75rem 0.75rem' }
const mapContainerStyleExpanded = { width: '100%', height: '80vh', borderRadius: '0 0 0.75rem 0.75rem' }

// ─── Index configuration ──────────────────────────────────────────────────────
const INDICES = [
  { key: 'ndvi', label: 'NDVI', Icon: Leaf,        title: 'Vegetation Health' },
  { key: 'ndwi', label: 'NDWI', Icon: Droplets,    title: 'Water Stress' },
  { key: 'ndre', label: 'NDRE', Icon: FlaskConical, title: 'Early N-Stress' },
]

// ─── Smooth gradient color stops (red → yellow → green) ─────────────────────
const GRADIENT_STOPS = {
  ndvi: [
    { v: -0.1, r: 215, g: 48,  b: 39  },
    { v:  0.1, r: 244, g: 109, b: 67  },
    { v:  0.2, r: 253, g: 174, b: 97  },
    { v:  0.3, r: 254, g: 224, b: 139 },
    { v:  0.4, r: 217, g: 239, b: 139 },
    { v:  0.5, r: 166, g: 217, b: 106 },
    { v:  0.6, r: 102, g: 189, b: 99  },
    { v:  0.8, r: 26,  g: 152, b: 80  },
  ],
  ndwi: [
    { v: -0.5, r: 215, g: 48,  b: 39  },
    { v: -0.35,r: 244, g: 109, b: 67  },
    { v: -0.2, r: 253, g: 174, b: 97  },
    { v: -0.05,r: 255, g: 255, b: 191 },
    { v:  0.05,r: 171, g: 217, b: 233 },
    { v:  0.15,r: 116, g: 173, b: 209 },
    { v:  0.25,r: 69,  g: 117, b: 180 },
    { v:  0.4, r: 49,  g: 54,  b: 149 },
  ],
  ndre: [
    { v: -0.1, r: 215, g: 48,  b: 39  },
    { v:  0.1, r: 244, g: 109, b: 67  },
    { v:  0.18,r: 253, g: 174, b: 97  },
    { v:  0.25,r: 254, g: 224, b: 139 },
    { v:  0.32,r: 217, g: 239, b: 139 },
    { v:  0.38,r: 166, g: 217, b: 106 },
    { v:  0.45,r: 102, g: 189, b: 99  },
    { v:  0.6, r: 26,  g: 152, b: 80  },
  ],
}

/** Interpolate gradient stops → RGB */
function valueToRgb(stops, value) {
  if (value <= stops[0].v) return stops[0]
  if (value >= stops[stops.length - 1].v) return stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].v && value <= stops[i + 1].v) {
      const t = (value - stops[i].v) / (stops[i + 1].v - stops[i].v)
      return {
        r: Math.round(stops[i].r + t * (stops[i + 1].r - stops[i].r)),
        g: Math.round(stops[i].g + t * (stops[i + 1].g - stops[i].g)),
        b: Math.round(stops[i].b + t * (stops[i + 1].b - stops[i].b)),
      }
    }
  }
  return stops[stops.length - 1]
}

/** Convert value to hex color */
function valueToHex(indexKey, value) {
  const { r, g, b } = valueToRgb(GRADIENT_STOPS[indexKey], value)
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

// ─── Point-in-polygon (ray casting) ─────────────────────────────────────────
function pointInPolygon(px, py, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

// ─── Canvas IDW heatmap generator ───────────────────────────────────────────
/**
 * Generates a smooth heatmap PNG (as data URL) from zone center points
 * using Inverse Distance Weighted interpolation.
 * Only pixels inside the farm boundary are colored; outside = transparent.
 */
function generateHeatmap(zones, indexKey, boundaryRing) {
  const points = []
  for (const z of zones) {
    const val = z[indexKey]
    if (val === null || val === undefined) continue
    let center = z.center
    if (typeof center === 'string') {
      try { center = JSON.parse(center) } catch (_) { continue }
    }
    if (!Array.isArray(center) || center.length < 2) continue
    points.push({ lng: center[0], lat: center[1], value: val })
  }
  if (points.length === 0) return null

  // Compute tight bbox from the boundary ring
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const [lng, lat] of boundaryRing) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  // Small padding so the overlay fully covers boundary edges
  const padLng = (east - west) * 0.03
  const padLat = (north - south) * 0.03
  west -= padLng; east += padLng; south -= padLat; north += padLat

  const W = 256, H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(W, H)
  const data = imageData.data
  const stops = GRADIENT_STOPS[indexKey]
  const dLng = east - west
  const dLat = north - south

  for (let y = 0; y < H; y++) {
    const lat = north - (y / H) * dLat
    for (let x = 0; x < W; x++) {
      const lng = west + (x / W) * dLng
      const i = (y * W + x) * 4

      // Transparent if outside farm boundary
      if (!pointInPolygon(lng, lat, boundaryRing)) {
        data[i + 3] = 0
        continue
      }

      // IDW interpolation (power = 2.5 for smoother blending)
      let sumW = 0, sumV = 0
      for (const p of points) {
        const d2 = (lng - p.lng) ** 2 + (lat - p.lat) ** 2
        const w = 1 / Math.max(d2 ** 1.25, 1e-14)
        sumW += w
        sumV += w * p.value
      }
      const val = sumV / sumW

      const c = valueToRgb(stops, val)
      data[i]     = c.r
      data[i + 1] = c.g
      data[i + 2] = c.b
      data[i + 3] = 190 // semi-transparent so satellite imagery shows through
    }
  }

  ctx.putImageData(imageData, 0, 0)

  return {
    url: canvas.toDataURL('image/png'),
    bounds: { south, west, north, east },
  }
}

// ─── Legends ─────────────────────────────────────────────────────────────────
const LEGENDS = {
  ndvi: [
    { color: '#1a9850', label: 'Healthy',  range: '≥0.55' },
    { color: '#66bd63', label: '',          range: '0.40-0.55' },
    { color: '#d9ef8b', label: 'Moderate',  range: '0.28-0.40' },
    { color: '#fee08b', label: 'Stressed',  range: '0.18-0.28' },
    { color: '#d73027', label: 'Critical',  range: '<0.18' },
  ],
  ndwi: [
    { color: '#313695', label: 'Wet/Flood', range: '>0.20' },
    { color: '#74add1', label: 'Moist',      range: '0-0.20' },
    { color: '#ffffbf', label: 'Adequate',   range: '-0.15-0' },
    { color: '#fdae61', label: 'Dry',        range: '-0.25 to -0.15' },
    { color: '#d73027', label: 'Drought',    range: '<-0.25' },
  ],
  ndre: [
    { color: '#1a9850', label: 'Excellent N', range: '≥0.40' },
    { color: '#66bd63', label: 'Good N',      range: '0.30-0.40' },
    { color: '#fee08b', label: 'Low N',       range: '0.22-0.30' },
    { color: '#fdae61', label: 'N Stress',    range: '0.15-0.22' },
    { color: '#d73027', label: 'N Deficit',   range: '<0.15' },
  ],
}

function getDisplayValue(activeIndex, report) {
  return report?.[`${activeIndex}_average`] ?? null
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NDVIOverlay({ boundary, report }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [activeIndex, setActiveIndex] = useState('ndvi')
  const [hoveredZone, setHoveredZone] = useState(null)
  const { isLoaded } = useGoogleMaps()

  const zones = report?.zones || []
  const displayValue = getDisplayValue(activeIndex, report)
  const hasData = displayValue !== null
  const farmAvgColor = hasData ? valueToHex(activeIndex, displayValue) : '#4ade80'

  const boundaryRing = boundary?.coordinates?.[0] || null

  // Generate smooth heatmap canvas — memoized per index + zone data
  const heatmap = useMemo(() => {
    if (!zones.length || !boundaryRing) return null
    try {
      return generateHeatmap(zones, activeIndex, boundaryRing)
    } catch (e) {
      console.warn('Heatmap generation failed:', e)
      return null
    }
  }, [zones, activeIndex, boundaryRing])

  const hasHeatmap = !!heatmap

  if (!isLoaded) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!boundaryRing) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center h-[300px]">
        <Satellite className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">{t('farmMonitor.noFarms')}</p>
      </div>
    )
  }

  const center = {
    lat: boundaryRing.reduce((s, c) => s + c[1], 0) / boundaryRing.length,
    lng: boundaryRing.reduce((s, c) => s + c[0], 0) / boundaryRing.length,
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in-up h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-black/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="glass-strong rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t('farmMonitor.satelliteView')}</span>
          </div>
          {hasData ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider bg-primary/20 text-primary">
              <span className="relative w-2 h-2 rounded-full bg-primary">
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
              </span>
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider bg-amber-500/15 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {t('farmMonitor.pendingScan')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Index Selector */}
          <div className="flex bg-muted/30 border border-border/60 rounded-lg overflow-hidden">
            {INDICES.map((idx) => {
              const IdxIcon = idx.Icon
              const isActive = activeIndex === idx.key
              return (
                <button
                  key={idx.key}
                  onClick={() => setActiveIndex(idx.key)}
                  title={idx.title}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <IdxIcon className="w-3 h-3" />
                  {idx.label}
                </button>
              )
            })}
          </div>

          {/* Current value display */}
          {hasData && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 rounded-lg border border-border">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: farmAvgColor }} />
              <span className="text-xs font-bold" style={{ color: farmAvgColor }}>
                {activeIndex.toUpperCase()}: {displayValue.toFixed(3)}
              </span>
            </div>
          )}

          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 bg-black/30 hover:bg-white/10 rounded-lg transition-colors border border-border"
          >
            <Maximize2 className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Pending data banner */}
      {!hasData && (
        <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">{t('farmMonitor.waitingSatelliteData')}</span>
        </div>
      )}

      {/* Zone stats bar */}
      {zones.length > 0 && (
        <div className="px-4 py-2 bg-muted/10 border-b border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{zones.length} zones</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{zones.filter(z => z.classification === 'healthy').length} healthy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />{zones.filter(z => z.classification === 'moderate').length} moderate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{zones.filter(z => z.classification === 'critical').length} critical</span>
          {hoveredZone && (
            <span className="ml-auto font-mono bg-black/30 px-2 py-0.5 rounded">
              {hoveredZone.zone_id}: {hoveredZone[activeIndex] !== null && hoveredZone[activeIndex] !== undefined
                ? hoveredZone[activeIndex].toFixed(3) : '—'}
              {' '}<span className="capitalize">({hoveredZone.classification})</span>
            </span>
          )}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 w-full relative min-h-0">
        <GoogleMap
          mapContainerStyle={expanded ? mapContainerStyleExpanded : mapContainerStyle}
          center={center}
          zoom={16}
          mapTypeId="satellite"
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: true,
            zoomControl: true,
            mapTypeControlOptions: { position: 3 },
          }}
        >
          {/* Farm boundary — white outline only */}
          <Polygon
            paths={boundaryRing.map(([lng, lat]) => ({ lat, lng }))}
            options={{
              fillColor: 'transparent',
              fillOpacity: 0,
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
              strokeOpacity: 0.9,
              zIndex: 20,
            }}
          />

          {/* Smooth heatmap overlay (canvas IDW) */}
          {hasHeatmap && (
            <GroundOverlay
              key={`heatmap-${activeIndex}`}
              url={heatmap.url}
              bounds={heatmap.bounds}
              options={{ opacity: 1, clickable: false }}
            />
          )}

          {/* Invisible zone polygons for hover tooltips (only when heatmap active) */}
          {hasHeatmap && zones.map((zone) => {
            let coords = zone.coordinates
            if (typeof coords === 'string') {
              try { coords = JSON.parse(coords) } catch (_) { return null }
            }
            if (coords && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
              coords = coords[0]
            }
            if (!coords || !Array.isArray(coords)) return null

            return (
              <Polygon
                key={zone.zone_id}
                paths={coords.map(([lng, lat]) => ({ lat, lng }))}
                options={{
                  fillColor: 'transparent',
                  fillOpacity: 0,
                  strokeColor: 'transparent',
                  strokeWeight: 0,
                  strokeOpacity: 0,
                  zIndex: 10,
                }}
                onMouseOver={() => setHoveredZone(zone)}
                onMouseOut={() => setHoveredZone(null)}
              />
            )
          })}

          {/* Fallback: colored zone polygons (when heatmap can't generate) */}
          {!hasHeatmap && zones.map((zone) => {
            const indexValue = zone[activeIndex]
            if (indexValue === null || indexValue === undefined) return null

            const fillColor = valueToHex(activeIndex, indexValue)
            const isCritical = zone.classification === 'critical'

            let coords = zone.coordinates
            if (typeof coords === 'string') {
              try { coords = JSON.parse(coords) } catch (_) { return null }
            }
            if (coords && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
              coords = coords[0]
            }
            if (!coords || !Array.isArray(coords)) return null

            return (
              <Polygon
                key={zone.zone_id}
                paths={coords.map(([lng, lat]) => ({ lat, lng }))}
                options={{
                  fillColor,
                  fillOpacity: 0.70,
                  strokeColor: isCritical ? '#ff4444' : fillColor,
                  strokeWeight: isCritical ? 2 : 0.5,
                  strokeOpacity: isCritical ? 1 : 0.3,
                  zIndex: isCritical ? 10 : 5,
                }}
                onMouseOver={() => setHoveredZone(zone)}
                onMouseOut={() => setHoveredZone(null)}
              />
            )
          })}
        </GoogleMap>
      </div>

      {/* Legend */}
      <div className="p-3 bg-gradient-to-r from-muted/30 to-muted/60 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {LEGENDS[activeIndex].map((item) => (
            <div key={item.range} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">
                {item.label ? `${item.label} ` : ''}{item.range}
              </span>
            </div>
          ))}
        </div>
        {boundary?.area_hectares != null && (
          <span className="text-xs font-medium text-muted-foreground">
            {boundary.area_hectares} {t('common.hectares')}
          </span>
        )}
      </div>
    </div>
  )
}
