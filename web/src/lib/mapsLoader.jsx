import { useJsApiLoader } from '@react-google-maps/api'

const LIBRARIES = ['drawing', 'geometry', 'places']

/**
 * Shared Google Maps loader hook.
 * Must be used everywhere instead of calling useJsApiLoader directly,
 * because Google Maps API can only be loaded once per page.
 */
export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  return { isLoaded, loadError }
}
