import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { todayOpening } from '../lib/format'
import type { Place } from '../types'
import { AmenityIcon } from './AmenityIcon'
import { StatusBadge } from './StatusBadge'

export function PlaceCard({ place, active = false, onHover }: { place: Place; active?: boolean; onHover?: () => void }) {
  return (
    <article className={`place-card ${active ? 'place-card--active' : ''}`} onMouseEnter={onHover}>
      <div className="place-card__topline">
        <StatusBadge status={place.status} />
        {place.verificationStatus === 'verified' && (
          <span className="verified-label" title="Établissement vérifié"><ShieldCheck size={16} /></span>
        )}
      </div>
      <h3>{place.name}</h3>
      <p className="place-card__address"><MapPin size={16} /> {place.address}, {place.postalCode} {place.city}</p>
      <p className="place-card__hours"><strong>{todayOpening(place)}</strong> aujourd’hui</p>
      {place.amenities.length > 0 && (
        <div className="amenity-list amenity-list--compact" aria-label="Services disponibles">
          {place.amenities.slice(0, 3).map((amenity) => (
            <span className="amenity-chip" key={amenity.code} title={amenity.label}>
              <AmenityIcon name={amenity.icon} size={16} />
              <span>{amenity.label}</span>
            </span>
          ))}
        </div>
      )}
      <div className="place-card__footer">
        <Link to={`/lieu/${place.slug}`} className="text-link">Voir la fiche <ArrowRight size={16} /></Link>
      </div>
    </article>
  )
}
