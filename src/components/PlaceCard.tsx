import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatRelativeDate, todayOpening } from '../lib/format'
import type { Place } from '../types'
import { AmenityIcon } from './AmenityIcon'
import { StatusBadge } from './StatusBadge'

export function PlaceCard({ place, active = false, onHover }: { place: Place; active?: boolean; onHover?: () => void }) {
  return (
    <article className={`place-card ${active ? 'place-card--active' : ''}`} onMouseEnter={onHover}>
      <div className="place-card__topline">
        <StatusBadge status={place.status} />
        {place.verificationStatus === 'verified' && (
          <span className="verified-label"><ShieldCheck size={16} /> Vérifiée</span>
        )}
      </div>
      <h3>{place.name}</h3>
      <p className="place-card__address"><MapPin size={17} /> {place.address}, {place.postalCode} {place.city}</p>
      <p className="place-card__hours">Aujourd’hui : <strong>{todayOpening(place)}</strong></p>
      <div className="amenity-list amenity-list--compact" aria-label="Services disponibles">
        {place.amenities.slice(0, 5).map((amenity) => (
          <span className="amenity-chip" key={amenity.code} title={amenity.label}>
            <AmenityIcon name={amenity.icon} size={17} />
            <span>{amenity.label}</span>
          </span>
        ))}
      </div>
      <div className="place-card__footer">
        <small>Mis à jour {formatRelativeDate(place.updatedAt)}</small>
        <Link to={`/lieu/${place.slug}`} className="text-link">Voir la fiche <ArrowRight size={17} /></Link>
      </div>
    </article>
  )
}
