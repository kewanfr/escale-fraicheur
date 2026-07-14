import { LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { searchAddresses } from '../lib/geocoding'
import type { AddressSuggestion } from '../types'

interface AddressSearchProps {
  onSelect: (suggestion: AddressSuggestion) => void
  onLocate: () => void
  locating?: boolean
  placeholder?: string
}

export function AddressSearch({ onSelect, onLocate, locating = false, placeholder = 'Ville, adresse ou lieu...' }: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setError(null)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)
      try {
        setSuggestions(await searchAddresses(trimmed, controller.signal))
      } catch (reason) {
        if ((reason as Error)?.name !== 'AbortError') {
          setError('La recherche d’adresse est momentanément indisponible.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 320)

    return () => window.clearTimeout(timer)
  }, [query])

  const choose = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.label)
    setSuggestions([])
    onSelect(suggestion)
  }

  return (
    <div className="address-search">
      <div className="address-search__input-wrap">
        <Search size={20} aria-hidden="true" />
        <input
          aria-label="Rechercher une adresse"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button type="button" className="address-search__clear" onClick={() => setQuery('')} aria-label="Effacer la recherche">
            <X size={18} />
          </button>
        )}
      </div>
      <button type="button" className="button button--locate" onClick={onLocate} disabled={locating}>
        <LocateFixed size={19} />
        {locating ? 'Localisation...' : 'Autour de moi'}
      </button>
      {(suggestions.length > 0 || loading || error) && (
        <div className="address-search__results" role="listbox">
          {loading && <p className="address-search__message">Recherche en cours…</p>}
          {error && <p className="address-search__message address-search__message--error">{error}</p>}
          {!loading && suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" role="option" onClick={() => choose(suggestion)}>
              <MapPin size={18} />
              <span>
                <strong>{suggestion.label}</strong>
                {(suggestion.postalCode || suggestion.city) && (
                  <small>{[suggestion.postalCode, suggestion.city].filter(Boolean).join(' ')}</small>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
