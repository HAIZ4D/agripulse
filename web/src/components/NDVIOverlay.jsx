import { useTranslation } from 'react-i18next'
import { GoogleMap, Polygon } from '@react-google-maps/api'
import { Satellite, Loader2, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { useGoogleMaps } from '../lib/mapsLoader'

const mapContainerStyle = { width: '100%', height: '100%', minHeight: '400px', flex: 1, borderRadius: '0 0 0.75rem 0.75rem' }
const mapContainerStyleExpanded = { width: '100%', height: '80vh', borderRadius: '0 0 0.75rem 0.75rem' }

function ndviToColor(ndvi) {
  if (ndvi >= 0.6) return { fill: '#15803d', label: 'healthy' }
  if (ndvi >= 0.4) return { fill: '#22c55e', label: 'healthy' }
  if (ndvi >= 0.3) return { fill: '#a3e635', label: 'moderate' }
  if (ndvi >= 0.2) return { fill: '#facc15', label: 'stressed' }
  if (ndvi >= 0.1) return { fill: '#f97316', label: 'stressed' }
  return { fill: '#ef4444', label: 'critical' }
}

function getStatusLabel(ndvi, t) {
  if (ndvi == null) return '—'
  if (ndvi >= 0.6) return t('farmMonitor.healthy')
  if (ndvi >= 0.4) return t('farmMonitor.healthy')
  if (ndvi >= 0.3) return t('farmMonitor.moderate')
  if (ndvi >= 0.2) return t('farmMonitor.stressed')
  return t('farmMonitor.critical')
}

export default function NDVIOverlay({ boundary, ndviAverage, ndviZones }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const { isLoaded } = useGoogleMaps()

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

  const color = ndviToColor(ndviAverage ?? 0)
  const statusLabel = getStatusLabel(ndviAverage, t)

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in-up h-full flex flex-col">
      {/* Header */}
      {/* Header */}
      <div className="p-4 border-b border-border bg-black/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="glass-strong rounded-xl px-4 py-2 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">NDVI Live Satellite</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider bg-primary/20 text-primary`}>
            <span className={`relative w-2 h-2 rounded-full bg-primary`}>
              <span className={`absolute inset-0 rounded-full bg-primary animate-ping opacity-75`} />
            </span>
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          {ndviAverage != null && (
            <div className="flex items-center gap-2 mx-2">
              <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" style={{ backgroundColor: color.fill }} />
              <span className="text-sm font-bold" style={{ color: color.fill }}>
                NDVI: {ndviAverage.toFixed(3)}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg font-bold tracking-wide" style={{ backgroundColor: color.fill + '20', color: color.fill }}>
                {statusLabel}
              </span>
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 bg-black/30 hover:bg-white/10 rounded-lg transition-colors border border-border"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <Maximize2 className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

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
            mapTypeControlOptions: {
              position: 3, // TOP_RIGHT
            },
          }}
        >
        {/* Main farm polygon */}
        <Polygon
          paths={boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }))}
          options={{
            fillColor: color.fill,
            fillOpacity: 0.4,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
            strokeOpacity: 0.9,
          }}
        />

        {/* Zone-level overlays */}
        {ndviZones?.map((zone, i) => {
          const zoneColor = ndviToColor(zone.ndvi)
          return (
            <Polygon
              key={i}
              paths={zone.coordinates.map(([lng, lat]) => ({ lat, lng }))}
              options={{
                fillColor: zoneColor.fill,
                fillOpacity: 0.55,
                strokeColor: '#ffffff',
                strokeWeight: 1,
                strokeOpacity: 0.7,
              }}
            />
          )
        })}
      </GoogleMap>
      </div>

      {/* Legend */}
      <div className="p-3 bg-gradient-to-r from-muted/30 to-muted/60 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          {[
            { color: '#15803d', label: t('farmMonitor.healthy'), range: '0.6+' },
            { color: '#22c55e', label: '', range: '0.4-0.6' },
            { color: '#a3e635', label: t('farmMonitor.moderate'), range: '0.3-0.4' },
            { color: '#facc15', label: t('farmMonitor.stressed'), range: '0.2-0.3' },
            { color: '#ef4444', label: t('farmMonitor.critical'), range: '<0.2' },
          ].map((item) => (
            <div key={item.range} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">
                {item.label ? `${item.label}` : ''} {item.range}
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
