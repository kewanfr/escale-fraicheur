import { Check, Clock3, MapPin, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { Notice } from '../components/Notice'
import { useAuth } from '../context/AuthContext'
import {
  fetchModerationData,
  moderateClaim,
  moderatePlace,
  moderateSubmission,
  type ModerationData,
} from '../lib/api'
import { formatDateTime } from '../lib/format'

export function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [data, setData] = useState<ModerationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchModerationData())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger la file de modération.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && profile?.role === 'admin') void load()
  }, [user?.id, profile?.role])

  if (authLoading) return <main className="container page-shell"><Loader /></main>
  if (!user) return <Navigate to="/connexion?redirect=%2Fadministration" replace />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id)
    setError(null)
    try {
      await action()
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Action impossible.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="container page-shell admin-page">
      <div className="page-heading page-heading--row">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Modération</h1>
          <p>Validez les contributions publiques, les nouvelles fiches et les demandes de revendication.</p>
        </div>
        <Link className="button button--secondary" to="/dashboard">Retour à mon espace</Link>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {loading && <Loader label="Chargement de la modération…" />}

      {!loading && data && (
        <div className="moderation-sections">
          <section className="moderation-section">
            <div className="moderation-section__heading"><h2>Contributions publiques</h2><span>{data.submissions.length}</span></div>
            {data.submissions.length === 0 ? <p className="muted">Aucune contribution en attente.</p> : data.submissions.map((submission) => (
              <article className="moderation-card" key={submission.id}>
                <div className="moderation-card__topline">
                  <span className="pending-chip"><Clock3 size={15} /> {submission.kind}</span>
                  <small>{formatDateTime(submission.created_at)}</small>
                </div>
                <pre>{JSON.stringify(submission.payload, null, 2)}</pre>
                {submission.contact_email && <p><strong>Contact :</strong> {submission.contact_email}</p>}
                <div className="button-row">
                  <button className="button button--success" disabled={busyId === submission.id} onClick={() => void run(submission.id, () => moderateSubmission(submission.id, 'approve'))}><Check size={17} /> Approuver</button>
                  <button className="button button--danger" disabled={busyId === submission.id} onClick={() => void run(submission.id, () => moderateSubmission(submission.id, 'reject'))}><X size={17} /> Rejeter</button>
                </div>
              </article>
            ))}
          </section>

          <section className="moderation-section">
            <div className="moderation-section__heading"><h2>Nouveaux établissements</h2><span>{data.pendingPlaces.length}</span></div>
            {data.pendingPlaces.length === 0 ? <p className="muted">Aucune fiche en attente.</p> : data.pendingPlaces.map((place) => (
              <article className="moderation-card" key={place.id}>
                <div className="moderation-card__place"><MapPin size={20} /><div><h3>{place.name}</h3><p>{place.address}, {place.postalCode} {place.city}</p></div></div>
                <div className="button-row">
                  <button className="button button--success" disabled={busyId === place.id} onClick={() => void run(place.id, () => moderatePlace(place.id, 'approve'))}><Check size={17} /> Publier</button>
                  <button className="button button--danger" disabled={busyId === place.id} onClick={() => void run(place.id, () => moderatePlace(place.id, 'reject'))}><X size={17} /> Rejeter</button>
                </div>
              </article>
            ))}
          </section>

          <section className="moderation-section">
            <div className="moderation-section__heading"><h2>Revendications</h2><span>{data.claims.length}</span></div>
            {data.claims.length === 0 ? <p className="muted">Aucune revendication en attente.</p> : data.claims.map((claim) => {
              const place = Array.isArray(claim.places) ? claim.places[0] : claim.places
              return (
                <article className="moderation-card" key={claim.id}>
                  <div className="moderation-card__place"><ShieldCheck size={20} /><div><h3>{place?.name ?? 'Lieu inconnu'}</h3><p>{place ? `${place.address_line}, ${place.postal_code} ${place.city}` : ''}</p></div></div>
                  {claim.message && <p className="moderation-card__message">{claim.message}</p>}
                  <div className="button-row">
                    <button className="button button--success" disabled={busyId === claim.id} onClick={() => void run(claim.id, () => moderateClaim(claim.id, 'approve'))}><Check size={17} /> Accepter</button>
                    <button className="button button--danger" disabled={busyId === claim.id} onClick={() => void run(claim.id, () => moderateClaim(claim.id, 'reject'))}><X size={17} /> Rejeter</button>
                  </div>
                </article>
              )
            })}
          </section>
        </div>
      )}
    </main>
  )
}
