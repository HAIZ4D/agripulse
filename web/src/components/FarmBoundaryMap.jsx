import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GoogleMap, Polygon, DrawingManager, Marker } from '@react-google-maps/api'
import { MapPin, Loader2, Search, X } from 'lucide-react'
import { useGoogleMaps } from '../lib/mapsLoader'

const mapContainerStyle = { width: '100%', height: '450px', borderRadius: '0 0 0.75rem 0.75rem' }
const defaultCenter = { lat: 3.0738, lng: 101.5183 } // Serdang, Selangor

function PlaceSearch({ onPlaceSelect }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [query, setQuery] = useState('')

  const handleRef = useCallback((node) => {
    if (!node || autocompleteRef.current) return
    inputRef.current = node

    const autocomplete = new window.google.maps.places.Autocomplete(node, {
      componentRestrictions: { country: 'my' },
      fields: ['geometry', 'name', 'formatted_address'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place?.geometry?.location) {
        const loc = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        }
        setQuery(place.name || place.formatted_address || '')
        onPlaceSelect(loc, place.geometry.viewport)
      }
    })

    autocompleteRef.current = autocomplete
  }, [onPlaceSelect])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        ref={handleRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('farmMonitor.searchPlaceholder')}
        className="w-full pl-9 pr-9 py-2.5 bg-muted/20 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-muted/30 transition-all"
      />
      {query && (
        <button
          onClick={() => { setQuery(''); if (inputRef.current) inputRef.current.value = '' }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default function FarmBoundaryMap({ boundary, onBoundaryChange, center }) {
  const { t } = useTranslation()
  const [drawingMode, setDrawingMode] = useState(!boundary)
  const [mapCenter, setMapCenter] = useState(null)
  const [searchPin, setSearchPin] = useState(null)
  const [zoom, setZoom] = useState(15)
  const mapRef = useRef(null)

  const { isLoaded } = useGoogleMaps()

  const onPolygonComplete = useCallback(
    (polygon) => {
      const path = polygon.getPath().getArray()
      const coordinates = path.map((p) => [p.lng(), p.lat()])
      coordinates.push(coordinates[0])

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
      setSearchPin(null)
      polygon.setMap(null)
    },
    [onBoundaryChange]
  )

  const handlePlaceSelect = useCallback((location, viewport) => {
    setSearchPin(location)
    setMapCenter(location)

    if (mapRef.current && viewport) {
      mapRef.current.fitBounds(viewport)
    } else {
      setZoom(17)
    }
  }, [])

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

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

  const resolvedCenter = mapCenter || center || (boundary?.coordinates?.[0]?.[0]
    ? { lat: boundary.coordinates[0][0][1], lng: boundary.coordinates[0][0][0] }
    : defaultCenter)

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-primary" />
          {t('farmMonitor.drawBoundary')}
        </h3>
        {boundary && (
          <button
            onClick={() => {
              onBoundaryChange?.(null)
              setDrawingMode(true)
            }}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {t('farmMonitor.redraw')}
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-border/30 bg-muted/10">
        <PlaceSearch onPlaceSelect={handlePlaceSelect} />
      </div>

      {/* Drawing instruction */}
      {drawingMode && !boundary && (
        <div className="px-4 py-2 bg-primary/5 text-xs text-primary font-medium flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {t('farmMonitor.drawInstructions')}
        </div>
      )}

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={resolvedCenter}
        zoom={zoom}
        mapTypeId="satellite"
        onLoad={onMapLoad}
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
                fillColor: '#4ade80',
                fillOpacity: 0.25,
                strokeColor: '#4ade80',
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
              fillColor: '#4ade80',
              fillOpacity: 0.25,
              strokeColor: '#4ade80',
              strokeWeight: 2,
            }}
          />
        )}

        {searchPin && (
          <Marker position={searchPin} />
        )}
      </GoogleMap>

      {/* Area display */}
      {boundary?.area_hectares != null && (
        <div className="px-4 py-3 bg-primary/5 border-t border-border/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">{t('farmMonitor.farmArea')}</span>
          <span className="text-sm font-bold text-primary">{boundary.area_hectares} {t('common.hectares')}</span>
        </div>
      )}
    </div>
  )
}
