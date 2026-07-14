import { AlertTriangle, Filter, Plus, SlidersHorizontal } from 'lucide-react'
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
      <section className="home-intro">
        <div className="container home-intro__inner">
          <div className="home-intro__copy">
            <h1>Trouver une Escale Fraîcheur</h1>
            <p>Des lieux accessibles pour se mettre au frais, s’asseoir ou boire de l’eau pendant les fortes chaleurs.</p>
          </div>
          <div className="home-intro__search">
            <AddressSearch onSelect={handleAddress} onLocate={locate} locating={locating} />
            {locationError && <p className="field-error">{locationError}</p>}
          </div>
        </div>
      </section>

      <main className="container map-section" id="carte">
        <div className="map-section__heading">
          <div className="map-section__title">
            <h2>Les Escales sur la carte</h2>
            <span>{filteredPlaces.length} lieu{filteredPlaces.length > 1 ? 'x' : ''}</span>
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
                Réinitialiser
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
                <h3>Aucune Escale trouvée</h3>
                <p>Modifiez vos filtres ou signalez un lieu manquant.</p>
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

        <div className="contribute-strip">
          <div>
            <strong>Une Escale manque sur la carte ?</strong>
            <span>Vous pouvez la signaler sans créer de compte.</span>
          </div>
          <Link className="button button--secondary" to="/signaler"><Plus size={18} /> Signaler un lieu</Link>
        </div>
      </main>
    </>
  )
}
