import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'lfg_last_location'
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
const POSITION_MAX_AGE_MS = 5 * 60 * 1000    // 5 minutes (browser cache)
const TIMEOUT_MS = 10000

function readCachedLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.lat || !parsed?.lng || !parsed?.timestamp) return null
    if (Date.now() - parsed.timestamp > CACHE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCachedLocation(coords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lat: coords.latitude,
      lng: coords.longitude,
      timestamp: Date.now(),
    }))
  } catch {
    // ignore quota errors
  }
}

export function useGeolocation() {
  const cached = readCachedLocation()
  const [location, setLocation] = useState(cached)
  const [status, setStatus] = useState(cached ? 'cached' : 'idle')
  const [error, setError] = useState(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      setError('Geolocation not supported')
      return
    }

    setStatus(prev => (prev === 'cached' ? 'refreshing' : 'loading'))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        }
        setLocation(next)
        setStatus('ready')
        setError(null)
        writeCachedLocation(position.coords)
      },
      (err) => {
        if (err.code === 1) {
          // PERMISSION_DENIED — clear stale cache so UI falls back cleanly
          localStorage.removeItem(STORAGE_KEY)
          setLocation(null)
          setStatus('error')
        } else {
          // Timeout or position unavailable — keep cached location if we have one
          setStatus(prev => (prev === 'refreshing' ? 'cached' : 'error'))
        }
        setError(err.message)
      },
      {
        enableHighAccuracy: false,
        timeout: TIMEOUT_MS,
        maximumAge: POSITION_MAX_AGE_MS,
      }
    )
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  return {
    location,
    status,
    error,
    refresh: requestLocation,
  }
}
