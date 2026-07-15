import { Clock3, MapPin, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { todayOpening } from '../lib/format'
import type { Place } from '../types'
import { AmenityIcon } from './AmenityIcon'
import { StatusBadge } from './StatusBadge'

export function PlaceCard({ place, active = false, onHover }: { place: Place; active?: boolean; onHover?: () => void }) {
  return (
    <Link
      to={`/lieu/${place.slug}`}
      className={`place-card ${active ? 'place-card--active' : ''}`}
      onMouseEnter={onHover}
      aria-label={`Voir la fiche de ${place.name}`}
    >
      <div className="place-card__topline">
        <StatusBadge status={place.status} />
        {typeof place.distanceKm === 'number' && <span className="place-card__distance">{place.distanceKm.toFixed(1)} km</span>}
      </div>

      <h3>{place.name}</h3>

      <p className="place-card__address">
        <MapPin size={15} />
        <span>{place.address}, {place.postalCode} {place.city}</span>
      </p>

      <div className="place-card__meta">
        <span><Clock3 size={15} /> Aujourd’hui : <strong>{todayOpening(place)}</strong></span>
        {place.verificationStatus === 'verified' && (
          <span className="verified-label" title="Établissement vérifié"><ShieldCheck size={15} /> Vérifié</span>
        )}
      </div>

      {place.amenities.length > 0 && (
        <div className="amenity-list amenity-list--compact" aria-label="Services disponibles">
          {place.amenities.slice(0, 4).map((amenity) => (
            <span className="amenity-chip" key={amenity.code} title={amenity.label}>
              <AmenityIcon name={amenity.icon} size={15} />
              <span>{amenity.label}</span>
            </span>
          ))}
          {place.amenities.length > 4 && <span className="amenity-chip amenity-chip--more">+{place.amenities.length - 4}</span>}
        </div>
      )}
    </Link>
  )
}
