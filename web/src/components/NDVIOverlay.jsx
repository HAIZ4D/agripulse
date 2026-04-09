import { useTranslation } from 'react-i18next'
import { GoogleMap, Polygon } from '@react-google-maps/api'
import { Satellite, Loader2, Maximize2, Leaf, Droplets, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { useGoogleMaps } from '../lib/mapsLoader'

const mapContainerStyle = { width: '100%', height: '100%', minHeight: '400px', flex: 1, borderRadius: '0 0 0.75rem 0.75rem' }
const mapContainerStyleExpanded = { width: '100%', height: '80vh', borderRadius: '0 0 0.75rem 0.75rem' }

// ─── Index configuration ──────────────────────────────────────────────────────
const INDICES = [
  { key: 'ndvi', label: 'NDVI', Icon: Leaf,        title: 'Vegetation Health' },
  { key: 'ndwi', label: 'NDWI', Icon: Droplets,    title: 'Water Stress' },
  { key: 'ndre', label: 'NDRE', Icon: FlaskConical, title: 'Early N-Stress' },
]

// ─── Color scales per index ───────────────────────────────────────────────────
function ndviToColor(value) {
  if (value >= 0.55) return { fill: '#15803d', label: 'healthy' }
  if (value >= 0.40) return { fill: '#22c55e', label: 'healthy' }
  if (value >= 0.28) return { fill: '#a3e635', label: 'moderate' }
  if (value >= 0.18) return { fill: '#facc15', label: 'stressed' }
  if (value >= 0.08) return { fill: '#f97316', label: 'stressed' }
  return { fill: '#ef4444', label: 'critical' }
}

function ndwiToColor(value) {
  // NDWI: higher = more water (good in moderation); very negative = dry
  if (value > 0.20)  return { fill: '#1d4ed8', label: 'wet/flood' }
  if (value > 0.00)  return { fill: '#3b82f6', label: 'moist' }
  if (value > -0.15) return { fill: '#22c55e', label: 'adequate' }
  if (value > -0.25) return { fill: '#facc15', label: 'dry' }
  if (value > -0.35) return { fill: '#f97316', label: 'stressed' }
  return { fill: '#ef4444', label: 'drought' }
}

function ndreToColor(value) {
  // NDRE: higher = better nitrogen / chlorophyll
  if (value >= 0.40) return { fill: '#15803d', label: 'excellent N' }
  if (value >= 0.30) return { fill: '#22c55e', label: 'good N' }
  if (value >= 0.22) return { fill: '#facc15', label: 'low N' }
  if (value >= 0.15) return { fill: '#f97316', label: 'N stress' }
  return { fill: '#ef4444', label: 'N deficit' }
}

const COLOR_FNS = { ndvi: ndviToColor, ndwi: ndwiToColor, ndre: ndreToColor }

const LEGENDS = {
  ndvi: [
    { color: '#15803d', label: 'Healthy',  range: '≥0.55' },
    { color: '#22c55e', label: '',          range: '0.40-0.55' },
    { color: '#a3e635', label: 'Moderate',  range: '0.28-0.40' },
    { color: '#facc15', label: 'Stressed',  range: '0.18-0.28' },
    { color: '#ef4444', label: 'Critical',  range: '<0.18' },
  ],
  ndwi: [
    { color: '#1d4ed8', label: 'Wet/Flood', range: '>0.20' },
    { color: '#3b82f6', label: 'Moist',      range: '0-0.20' },
    { color: '#22c55e', label: 'Adequate',   range: '-0.15-0' },
    { color: '#facc15', label: 'Dry',        range: '-0.25 to -0.15' },
    { color: '#ef4444', label: 'Drought',    range: '<-0.25' },
  ],
  ndre: [
    { color: '#15803d', label: 'Excellent N', range: '≥0.40' },
    { color: '#22c55e', label: 'Good N',      range: '0.30-0.40' },
    { color: '#facc15', label: 'Low N',       range: '0.22-0.30' },
    { color: '#f97316', label: 'N Stress',    range: '0.15-0.22' },
    { color: '#ef4444', label: 'N Deficit',   range: '<0.15' },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFarmColor(activeIndex, report) {
  const fn = COLOR_FNS[activeIndex]
  const value = report?.[`${activeIndex}_average`] ?? null
  if (value === null) return { fill: '#4ade80', label: 'pending' }
  return fn(value)
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
  const farmColor = getFarmColor(activeIndex, report)
  const colorFn = COLOR_FNS[activeIndex]

  if (!isLoaded) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!boundary?.coordinates?.[0]) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center h-[300px]">
        <Satellite className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">{t('farmMonitor.noFarms')}</p>
      </div>
    )
  }

  const center = {
    lat: boundary.coordinates[0].reduce((s, c) => s + c[1], 0) / boundary.coordinates[0].length,
    lng: boundary.coordinates[0].reduce((s, c) => s + c[0], 0) / boundary.coordinates[0].length,
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
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: farmColor.fill }} />
              <span className="text-xs font-bold" style={{ color: farmColor.fill }}>
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
          {/* Farm boundary — outer outline only (no fill, zones handle it) */}
          <Polygon
            paths={boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }))}
            options={{
              fillColor: zones.length > 0 ? 'transparent' : (hasData ? farmColor.fill : '#4ade80'),
              fillOpacity: zones.length > 0 ? 0 : (hasData ? 0.35 : 0.08),
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
              strokeOpacity: 0.9,
            }}
          />

          {/* Zone-level polygons — colored by active index */}
          {zones.map((zone) => {
            const indexValue = zone[activeIndex]
            const zoneColor = indexValue !== null && indexValue !== undefined
              ? colorFn(indexValue)
              : { fill: '#6b7280' }
            const isCritical = zone.classification === 'critical'

            // Ensure path format: [[lng,lat],...] → [{lat,lng},...]
            let coords = zone.coordinates
            if (coords && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
              coords = coords[0]  // unwrap double-nested ring
            }
            if (!coords || !Array.isArray(coords)) return null

            return (
              <Polygon
                key={zone.zone_id}
                paths={coords.map(([lng, lat]) => ({ lat, lng }))}
                options={{
                  fillColor: zoneColor.fill,
                  fillOpacity: isCritical ? 0.65 : 0.50,
                  strokeColor: isCritical ? '#ff4444' : '#ffffff',
                  strokeWeight: isCritical ? 2 : 1,
                  strokeOpacity: isCritical ? 1 : 0.6,
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
