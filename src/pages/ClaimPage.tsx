import { Building2, Check, ShieldCheck } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { Notice } from '../components/Notice'
import { useAuth } from '../context/AuthContext'
import { fetchPlaceBySlug, requestClaim } from '../lib/api'
import type { Place } from '../types'

export function ClaimPage() {
  const { slug = '' } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [place, setPlace] = useState<Place | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlaceBySlug(slug)
      .then(setPlace)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Impossible de charger le lieu.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (authLoading || loading) return <main className="container page-shell"><Loader /></main>
  if (!user) return <Navigate to={`/connexion?redirect=${encodeURIComponent(`/revendiquer/${slug}`)}`} replace />
  if (!place) return <main className="container page-shell"><Notice tone="error">Escale introuvable.</Notice></main>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await requestClaim(place.id, message)
      setSuccess(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’envoyer la demande.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="container narrow-page page-shell">
        <div className="success-panel">
          <span className="success-panel__icon"><Check size={34} /></span>
          <h1>Demande envoyée</h1>
          <p>La revendication de <strong>{place.name}</strong> est en attente de vérification. Vous retrouverez le lieu dans votre tableau de bord une fois la demande acceptée.</p>
          <Link className="button button--primary" to="/dashboard">Aller à mon espace</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container narrow-page page-shell">
      <div className="page-heading">
        <span className="eyebrow">Revendication d’une fiche</span>
        <h1>Vous représentez {place.name} ?</h1>
        <p>Expliquez brièvement votre lien avec l’établissement. Un administrateur vérifiera la demande avant de vous donner accès à la gestion de la fiche.</p>
      </div>

      <div className="selected-place-box selected-place-box--large">
        <Building2 size={24} />
        <div><strong>{place.name}</strong><span>{place.address}, {place.postalCode} {place.city}</span></div>
      </div>

      <form className="form-card" onSubmit={submit}>
        <label>
          Votre rôle ou votre lien avec l’établissement
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={1000} placeholder="Ex. Je suis responsable du magasin / directeur du centre / membre de l’équipe communication…" />
        </label>
        <div className="privacy-note"><ShieldCheck size={19} /><span>Évitez d’envoyer une pièce d’identité ou un document sensible. La vérification peut se faire par une adresse professionnelle, un site officiel ou un échange direct.</span></div>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="button button--primary button--full" type="submit" disabled={submitting}>
          {submitting ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>
    </main>
  )
}
