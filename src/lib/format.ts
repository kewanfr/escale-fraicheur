import type { OpeningPeriod, Place, PlaceStatus } from '../types'

const statusLabels: Record<PlaceStatus, string> = {
  open: 'Ouverte actuellement',
  conditional: 'Ouverture conditionnelle',
  unconfirmed: 'Information à confirmer',
  closed: 'Temporairement indisponible',
}

export function statusLabel(status: PlaceStatus) {
  return statusLabels[status]
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatRelativeDate(value: string) {
  const date = new Date(value)
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60_000)
  const abs = Math.abs(diffMinutes)
  const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })

  if (abs < 60) return rtf.format(diffMinutes, 'minute')
  const hours = Math.round(diffMinutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  const days = Math.round(hours / 24)
  return rtf.format(days, 'day')
}

export function formatHours(period: OpeningPeriod) {
  return `${period.opens.slice(0, 5).replace(':', ' h ')} – ${period.closes.slice(0, 5).replace(':', ' h ')}`
}

export function todayOpening(place: Place): string {
  const jsDay = new Date().getDay()
  const weekday = jsDay === 0 ? 7 : jsDay
  const periods = place.openingPeriods.filter((period) => period.weekday === weekday)
  if (!periods.length) return 'Horaires non renseignés aujourd’hui'
  return periods.map(formatHours).join(', ')
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function safeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90)
}
