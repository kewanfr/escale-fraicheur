import { AlertTriangle, Filter, MapPin, Plus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch'
import { Loader } from '../components/Loader'
import { MapView } from '../components/MapView'
import { Notice } from '../components/Notice'
import { PlaceCard } from '../components/PlaceCard'
import { AMENITIES } from '../data/demo'
import { usePlaces } from '../hooks/usePlaces'
import { distanceKm } from '../lib/format'
import type { AddressSuggestion, Place, PlaceStatus } from '../types'

const statusOptions: Array<{ value: PlaceStatus; label: string }> = [
  { value: 'open', label: 'Ouvertes' },
  { value: 'conditional', label: 'Conditionnelles' },
  { value: 'unconfirmed', label: 'À confirmer' },
]

export function HomePage() {
  const { places, loading, error } = usePlaces()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<PlaceStatus[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null)
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const filteredPlaces = useMemo(() => {
    let result = places.filter((place) => {
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(place.status)
      const placeAmenityCodes = new Set(place.amenities.map((amenity) => amenity.code))
      const matchesAmenities = selectedAmenities.every((code) => placeAmenityCodes.has(code))
      return matchesStatus && matchesAmenities
    })

    if (userPosition) {
      result = result
        .map((place) => ({
          ...place,
          distanceKm: distanceKm(userPosition.latitude, userPosition.longitude, place.latitude, place.longitude),
        }))
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    }

    return result
  }, [places, selectedAmenities, selectedStatuses, userPosition])

  const handleAddress = (suggestion: AddressSuggestion) => {
    setCenter({ latitude: suggestion.latitude, longitude: suggestion.longitude })
  }

  const locate = () => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n’est pas disponible dans ce navigateur.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = { latitude: coords.latitude, longitude: coords.longitude }
        setUserPosition(position)
        setCenter(position)
        setLocating(false)
      },
      () => {
        setLocationError('Impossible d’accéder à votre position. Vous pouvez rechercher une adresse manuellement.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  const handleSelectPlace = (place: Place) => {
    setSelectedId(place.id)
    setCenter({ latitude: place.latitude, longitude: place.longitude })
    if (window.innerWidth < 760) {
      navigate(`/lieu/${place.slug}`)
    }
  }

  const toggleAmenity = (code: string) => {
    setSelectedAmenities((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
  }

  const toggleStatus = (status: PlaceStatus) => {
    setSelectedStatuses((current) => current.includes(status) ? current.filter((item) => item !== status) : [...current, status])
  }

  const activeFilterCount = selectedAmenities.length + selectedStatuses.length

  return (
    <>
      <section className="hero">
        <div className="hero__sun" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="container hero__content">
          <div className="hero__copy">
            <span className="eyebrow">Un refuge contre les fortes chaleurs</span>
            <h1>Trouvez une <span>Escale Fraîcheur</span> près de vous</h1>
            <p>
              Repérez rapidement un lieu accueillant, consultez ses horaires et ses modalités d’accueil, puis obtenez votre itinéraire.
            </p>
          </div>
          <div className="hero__search-panel">
            <AddressSearch onSelect={handleAddress} onLocate={locate} locating={locating} />
            {locationError && <p className="field-error">{locationError}</p>}
            <p className="hero__hint"><MapPin size={16} /> Aucun compte nécessaire pour consulter la carte.</p>
          </div>
        </div>
      </section>

      <main className="container map-section" id="carte">
        <div className="map-section__heading">
          <div>
            <span className="eyebrow">Carte collaborative</span>
            <h2>Les Escales disponibles</h2>
            <p>{filteredPlaces.length} lieu{filteredPlaces.length > 1 ? 'x' : ''} affiché{filteredPlaces.length > 1 ? 's' : ''}</p>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setFiltersOpen((value) => !value)}>
            <SlidersHorizontal size={18} /> Filtres {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
        </div>

        {filtersOpen && (
          <div className="filters-panel">
            <div>
              <h3><Filter size={18} /> Statut</h3>
              <div className="filter-pills">
                {statusOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={selectedStatuses.includes(option.value) ? 'filter-pill filter-pill--active' : 'filter-pill'}
                    onClick={() => toggleStatus(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3>Services</h3>
              <div className="filter-pills">
                {AMENITIES.slice(0, 5).map((amenity) => (
                  <button
                    type="button"
                    key={amenity.code}
                    className={selectedAmenities.includes(amenity.code) ? 'filter-pill filter-pill--active' : 'filter-pill'}
                    onClick={() => toggleAmenity(amenity.code)}
                  >
                    {amenity.label}
                  </button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button type="button" className="text-button" onClick={() => { setSelectedAmenities([]); setSelectedStatuses([]) }}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {error && <Notice tone="error"><AlertTriangle size={19} /> {error}</Notice>}

        <div className="map-layout">
          <section className="map-layout__map" aria-label="Carte des lieux">
            {loading ? (
              <Loader label="Chargement de la carte…" />
            ) : (
              <MapView
                places={filteredPlaces}
                selectedId={selectedId}
                center={center}
                userPosition={userPosition}
                onSelect={handleSelectPlace}
              />
            )}
          </section>
          <section className="map-layout__list" aria-label="Liste des lieux">
            {loading && <Loader label="Chargement des Escales…" />}
            {!loading && filteredPlaces.length === 0 && (
              <div className="empty-state">
                <h3>Aucune Escale ne correspond à ces filtres</h3>
                <p>Élargissez vos critères ou signalez un lieu manquant.</p>
                <Link className="button button--primary" to="/signaler"><Plus size={18} /> Signaler un lieu</Link>
              </div>
            )}
            {!loading && filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                active={selectedId === place.id}
                onHover={() => setSelectedId(place.id)}
              />
            ))}
          </section>
        </div>
      </main>

      <section className="community-cta">
        <div className="container community-cta__inner">
          <div>
            <span className="eyebrow">La carte est collaborative</span>
            <h2>Vous connaissez une Escale qui manque ?</h2>
            <p>Signalez-la en quelques instants, sans créer de compte. Elle sera vérifiée avant sa publication.</p>
          </div>
          <Link className="button button--primary button--large" to="/signaler"><Plus size={20} /> Signaler une Escale</Link>
        </div>
      </section>
    </>
  )
}
