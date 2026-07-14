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
  const markersRef = useRef<Map<string, Marker>>(new Map())
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const userMarkerRef = useRef<Marker | null>(null)
  const didFitRef = useRef(false)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-1.5536, 47.2184],
      zoom: 11.2,
      attributionControl: {},
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()
      markerElementsRef.current.clear()
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nextIds = new Set(places.map((place) => place.id))

    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
        markerElementsRef.current.delete(id)
      }
    })

    places.forEach((place) => {
      const existingMarker = markersRef.current.get(place.id)
      const existingElement = markerElementsRef.current.get(place.id)

      if (existingMarker && existingElement) {
        existingMarker.setLngLat([place.longitude, place.latitude])
        existingElement.className = `${statusClass(place.status)}${selectedId === place.id ? ' map-marker--selected' : ''}`
        existingElement.setAttribute('aria-label', `Voir ${place.name}`)
        return
      }

      const button = document.createElement('button')
      button.type = 'button'
      button.className = `${statusClass(place.status)}${selectedId === place.id ? ' map-marker--selected' : ''}`
      button.setAttribute('aria-label', `Voir ${place.name}`)
      button.innerHTML = '<span class="map-marker__dot"></span>'
      button.addEventListener('click', () => onSelectRef.current(place))

      const marker = new maplibregl.Marker({ element: button, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map)

      markersRef.current.set(place.id, marker)
      markerElementsRef.current.set(place.id, button)
    })

    if (!didFitRef.current && places.length > 1) {
      const bounds = new LngLatBounds()
      places.forEach((place) => bounds.extend([place.longitude, place.latitude]))
      map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 0 })
      didFitRef.current = true
    }
  }, [places])

  useEffect(() => {
    markerElementsRef.current.forEach((element, id) => {
      element.classList.toggle('map-marker--selected', id === selectedId)
    })
  }, [selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return
    map.flyTo({ center: [center.longitude, center.latitude], zoom: 13.5, duration: 700 })
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
