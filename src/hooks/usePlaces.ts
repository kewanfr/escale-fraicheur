import { useCallback, useEffect, useState } from 'react'
import { fetchPublicPlaces } from '../lib/api'
import type { Place } from '../types'

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPlaces(await fetchPublicPlaces())
    } catch (reason) {
      console.error(reason)
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les Escales Fraîcheur.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { places, loading, error, refresh }
}
