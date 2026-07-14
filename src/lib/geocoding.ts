import type { AddressSuggestion } from '../types'

const ENDPOINT = 'https://data.geopf.fr/geocodage/completion/'

type RawSuggestion = Record<string, unknown>

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function stringFrom(...values: unknown[]): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim() !== '') as string | undefined
}

function parseCoordinates(raw: RawSuggestion): { latitude: number; longitude: number } | null {
  const latitude = numberFrom(raw.y ?? raw.lat ?? raw.latitude)
  const longitude = numberFrom(raw.x ?? raw.lon ?? raw.lng ?? raw.longitude)
  if (latitude !== null && longitude !== null) return { latitude, longitude }

  const geometry = raw.geometry as { coordinates?: unknown[] } | undefined
  if (geometry?.coordinates?.length && geometry.coordinates.length >= 2) {
    const lon = numberFrom(geometry.coordinates[0])
    const lat = numberFrom(geometry.coordinates[1])
    if (lat !== null && lon !== null) return { latitude: lat, longitude: lon }
  }
  return null
}

function parseSuggestion(raw: RawSuggestion, index: number): AddressSuggestion | null {
  const coords = parseCoordinates(raw)
  if (!coords) return null

  const properties = (raw.properties ?? {}) as RawSuggestion
  const label = stringFrom(
    raw.fulltext,
    raw.label,
    raw.name,
    properties.label,
    properties.name,
  )

  if (!label) return null

  return {
    id: String(raw.id ?? properties.id ?? `${coords.longitude}-${coords.latitude}-${index}`),
    label,
    city: stringFrom(raw.city, raw.cityName, properties.city, properties.cityName),
    postalCode: stringFrom(raw.zipcode, raw.postcode, raw.postalCode, properties.postcode, properties.postalCode),
    ...coords,
  }
}

export async function searchAddresses(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const text = query.trim()
  if (text.length < 3) return []

  const params = new URLSearchParams({
    text,
    type: 'StreetAddress,PositionOfInterest',
    maximumResponses: '6',
  })

  const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Recherche d’adresse indisponible (${response.status})`)
  }

  const data = (await response.json()) as Record<string, unknown>
  const candidates = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data.features)
      ? data.features
      : Array.isArray(data)
        ? data
        : []

  return candidates
    .map((item, index) => parseSuggestion(item as RawSuggestion, index))
    .filter((item): item is AddressSuggestion => Boolean(item))
}
