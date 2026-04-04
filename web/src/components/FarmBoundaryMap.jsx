import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GoogleMap, Polygon, DrawingManager } from '@react-google-maps/api'
import { MapPin, Loader2 } from 'lucide-react'
import { useGoogleMaps } from '../lib/mapsLoader'

const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '0.75rem' }
const defaultCenter = { lat: 3.0738, lng: 101.5183 } // Serdang, Selangor

export default function FarmBoundaryMap({ boundary, onBoundaryChange, center }) {
  const { t } = useTranslation()
  const [drawingMode, setDrawingMode] = useState(!boundary)
  const polygonRef = useRef(null)

  const { isLoaded } = useGoogleMaps()

  const onPolygonComplete = useCallback(
    (polygon) => {
      const path = polygon.getPath().getArray()
      const coordinates = path.map((p) => [p.lng(), p.lat()])
      coordinates.push(coordinates[0]) // Close the polygon

      let hectares = 0
      try {
        hectares = window.google.maps.geometry.spherical.computeArea(polygon.getPath()) / 10000
      } catch {
        hectares = 0
      }

      onBoundaryChange?.({
        type: 'Polygon',
        coordinates: [coordinates],
        area_hectares: Math.round(hectares * 100) / 100,
      })
      setDrawingMode(false)
      polygon.setMap(null)
    },
    [onBoundaryChange]
  )

  if (!isLoaded) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  const mapCenter = center || (boundary?.coordinates?.[0]?.[0]
    ? { lat: boundary.coordinates[0][0][1], lng: boundary.coordinates[0][0][0] }
    : defaultCenter)

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          {t('farmMonitor.drawBoundary')}
        </h3>
        {boundary && (
          <button
            onClick={() => {
              onBoundaryChange?.(null)
              setDrawingMode(true)
            }}
            className="text-sm text-primary hover:underline"
          >
            {t('common.edit')}
          </button>
        )}
      </div>

      {drawingMode && !boundary && (
        <div className="px-4 py-2 bg-primary/5 text-sm text-primary">
          {t('farmMonitor.drawInstructions')}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={15}
        mapTypeId="satellite"
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {drawingMode && !boundary && (
          <DrawingManager
            drawingMode="polygon"
            onPolygonComplete={onPolygonComplete}
            options={{
              drawingControl: true,
              drawingControlOptions: {
                drawingModes: ['polygon'],
              },
              polygonOptions: {
                fillColor: '#2d6a4f',
                fillOpacity: 0.3,
                strokeColor: '#2d6a4f',
                strokeWeight: 2,
                editable: true,
              },
            }}
          />
        )}

        {boundary?.coordinates?.[0] && (
          <Polygon
            paths={boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }))}
            options={{
              fillColor: '#2d6a4f',
              fillOpacity: 0.3,
              strokeColor: '#2d6a4f',
              strokeWeight: 2,
            }}
          />
        )}
      </GoogleMap>

      {boundary?.area_hectares != null && (
        <div className="p-3 bg-muted/50 text-sm text-center">
          {boundary.area_hectares} {t('common.hectares')}
        </div>
      )}
    </div>
  )
}
