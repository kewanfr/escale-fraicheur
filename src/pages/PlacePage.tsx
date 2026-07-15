import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Flag,
  MapPin,
  Navigation,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AmenityIcon } from '../components/AmenityIcon'
import { Loader } from '../components/Loader'
import { MapView } from '../components/MapView'
import { Notice } from '../components/Notice'
import { StatusBadge } from '../components/StatusBadge'
import { fetchPlaceBySlug } from '../lib/api'
import { formatRelativeDate, todayOpening } from '../lib/format'
import type { Place } from '../types'

const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export function PlacePage() {
  const { slug = '' } = useParams()
  const [place, setPlace] = useState<Place | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchPlaceBySlug(slug)
      .then(setPlace)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Impossible de charger cette Escale.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <main className="container page-shell"><Loader label="Chargement de l’Escale…" /></main>
  if (error) return <main className="container page-shell"><Notice tone="error">{error}</Notice></main>

  if (!place) {
    return (
      <main className="container page-shell empty-state">
        <h1>Escale introuvable</h1>
        <p>Cette fiche n’existe pas ou n’est plus publiée.</p>
        <Link className="button button--primary" to="/">Retour à la carte</Link>
      </main>
    )
  }

  const groupedPeriods = weekdays.map((label, index) => ({
    label,
    periods: place.openingPeriods.filter((period) => period.weekday === index + 1),
  }))

  const osmDirections = `https://www.openstreetmap.org/directions?to=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`

  return (
    <main className="place-page">
      <div className="container place-page__back">
        <Link className="text-link" to="/"><ArrowLeft size={17} /> Retour à la carte</Link>
      </div>

      <section className="container place-hero">
        <div className="place-hero__copy">
          <div className="place-hero__badges">
            <StatusBadge status={place.status} />
            {place.verificationStatus === 'verified' && (
              <span className="verified-label verified-label--large"><ShieldCheck size={16} /> Établissement vérifié</span>
            )}
          </div>

          <h1>{place.name}</h1>
          <p className="place-hero__address"><MapPin size={19} /> {place.address}, {place.postalCode} {place.city}</p>

          <div className="place-hero__today">
            <CalendarClock size={20} />
            <div>
              <span>Aujourd’hui</span>
              <strong>{todayOpening(place)}</strong>
            </div>
          </div>

          <div className="place-hero__actions">
            <a className="button button--primary" href={osmDirections} target="_blank" rel="noreferrer">
              <Navigation size={18} /> Itinéraire <ExternalLink size={14} />
            </a>
            <Link className="button button--secondary" to={`/signaler?kind=correction&place=${encodeURIComponent(place.slug)}`}>
              <Flag size={17} /> Signaler une erreur
            </Link>
          </div>
        </div>

        <div className="place-hero__map">
          <MapView
            places={[place]}
            selectedId={place.id}
            center={{ latitude: place.latitude, longitude: place.longitude }}
            onSelect={() => undefined}
          />
        </div>
      </section>

      <div className="container place-content-grid">
        <div className="place-content-main">
          <section className="content-card content-card--services">
            <div className="section-heading">
              <h2>Ce que vous trouverez sur place</h2>
              <p>Les services indiqués pour cette Escale.</p>
            </div>

            {place.amenities.length > 0 ? (
              <div className="amenities-grid">
                {place.amenities.map((amenity) => (
                  <div className="amenity-card" key={amenity.code}>
                    <span className="amenity-card__icon"><AmenityIcon name={amenity.icon} size={24} /></span>
                    <strong>{amenity.label}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>Les modalités détaillées n’ont pas encore été renseignées.</p>
            )}

            {place.description && <p className="place-description">{place.description}</p>}
          </section>

          <section className="content-card">
            <div className="section-heading">
              <h2>Informations récentes</h2>
              <p>Les dernières nouvelles publiées par le lieu.</p>
            </div>

            {place.posts.length > 0 ? (
              <div className="posts-list">
                {place.posts.map((post) => (
                  <article className="post-card" key={post.id}>
                    <div className="post-card__icon"><CircleAlert size={19} /></div>
                    <div>
                      {post.title && <h3>{post.title}</h3>}
                      <p>{post.body}</p>
                      <small>Publié {formatRelativeDate(post.createdAt)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="quiet-state"><CheckCircle2 size={20} /><span>Aucune information temporaire signalée.</span></div>
            )}
          </section>
        </div>

        <aside className="place-sidebar">
          <section className="content-card content-card--sticky">
            <h2>Horaires habituels</h2>
            <div className="hours-list">
              {groupedPeriods.map(({ label, periods }) => (
                <div className="hours-row" key={label}>
                  <span>{label}</span>
                  <strong>{periods.length ? periods.map((period) => `${period.opens.slice(0, 5)} – ${period.closes.slice(0, 5)}`).join(', ') : 'Non renseigné'}</strong>
                </div>
              ))}
            </div>
            <small className="muted">Mise à jour {formatRelativeDate(place.updatedAt)}.</small>
          </section>

          <section className="content-card claim-card">
            <h2>Vous représentez ce lieu ?</h2>
            <p>Vous pouvez revendiquer la fiche pour modifier les informations et publier des actualités.</p>
            <Link className="text-link" to={`/revendiquer/${place.slug}`}>Revendiquer cette Escale</Link>
          </section>
        </aside>
      </div>
    </main>
  )
}
