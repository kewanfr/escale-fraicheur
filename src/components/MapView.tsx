import maplibregl, { LngLatBounds, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Place } from '../types'

interface MapViewProps {
  places: Place[]
  selectedId?: string | null
  center?: { latitude: number; longitude: number } | null
  userPosition?: { latitude: number; longitude: number } | null
  onSelect: (place: Place) => void
}

const statusClass = (status: Place['status']) => `map-marker map-marker--${status}`

export function MapView({ places, selectedId, center, userPosition, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userMarkerRef = useRef<Marker | null>(null)
  const didFitRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-1.5536, 47.2184],
      zoom: 11.2,
      attributionControl: {},
    })
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = places.map((place) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `${statusClass(place.status)} ${selectedId === place.id ? 'map-marker--selected' : ''}`
      button.setAttribute('aria-label', `Voir ${place.name}`)
      button.innerHTML = '<span class="map-marker__dot"></span>'
      button.addEventListener('click', () => onSelect(place))

      return new maplibregl.Marker({ element: button, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map)
    })

    if (!didFitRef.current && places.length > 1) {
      const bounds = new LngLatBounds()
      places.forEach((place) => bounds.extend([place.longitude, place.latitude]))
      map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 0 })
      didFitRef.current = true
    }
  }, [places, selectedId, onSelect])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return
    map.flyTo({ center: [center.longitude, center.latitude], zoom: 13.5, duration: 900 })
  }, [center])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    userMarkerRef.current?.remove()
    userMarkerRef.current = null
    if (!userPosition) return

    const marker = document.createElement('div')
    marker.className = 'user-marker'
    marker.setAttribute('aria-label', 'Votre position')
    userMarkerRef.current = new maplibregl.Marker({ element: marker })
      .setLngLat([userPosition.longitude, userPosition.latitude])
      .addTo(map)
  }, [userPosition])

  return <div ref={containerRef} className="map-view" aria-label="Carte des Escales Fraîcheur" />
}
