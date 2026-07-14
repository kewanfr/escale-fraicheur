import { Building2, LogOut, Plus, ShieldCheck } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch'
import { AmenityIcon } from '../components/AmenityIcon'
import { Loader } from '../components/Loader'
import { ManagedPlaceEditor } from '../components/ManagedPlaceEditor'
import { Notice } from '../components/Notice'
import { useAuth } from '../context/AuthContext'
import { AMENITIES } from '../data/demo'
import { createOwnedPlace, fetchManagedPlaces, signOut } from '../lib/api'
import type { AddressSuggestion, ManagedPlace } from '../types'

export function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [managedPlaces, setManagedPlaces] = useState<ManagedPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      setManagedPlaces(await fetchManagedPlaces())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos établissements.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void load()
  }, [user?.id])

  if (authLoading) return <main className="container page-shell"><Loader /></main>
  if (!user) return <Navigate to="/connexion?redirect=%2Fdashboard" replace />

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div className="container dashboard-hero__inner">
          <div>
            <span className="eyebrow">Espace établissement</span>
            <h1>Bonjour{user.email ? `, ${user.email.split('@')[0]}` : ''}</h1>
            <p>Gérez vos lieux, publiez des informations temporaires et suivez vos demandes.</p>
          </div>
          <div className="dashboard-hero__actions">
            {profile?.role === 'admin' && (
              <Link className="button button--secondary" to="/administration"><ShieldCheck size={18} /> Modération</Link>
            )}
            <button className="button button--ghost" type="button" onClick={() => void signOut()}><LogOut size={18} /> Se déconnecter</button>
          </div>
        </div>
      </section>

      <div className="container dashboard-content">
        <div className="dashboard-toolbar">
          <div>
            <h2>Mes Escales</h2>
            <p>{managedPlaces.length} lieu{managedPlaces.length > 1 ? 'x' : ''} géré{managedPlaces.length > 1 ? 's' : ''}</p>
          </div>
          <button className="button button--primary" type="button" onClick={() => setShowCreate((value) => !value)}>
            <Plus size={18} /> Ajouter mon établissement
          </button>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {showCreate && <CreateOwnedPlaceForm onCreated={async () => { setShowCreate(false); await load() }} />}

        {loading ? (
          <Loader label="Chargement de vos Escales…" />
        ) : managedPlaces.length > 0 ? (
          <div className="managed-list">
            {managedPlaces.map((managed) => (
              <ManagedPlaceEditor key={managed.placeId} managed={managed} onSaved={load} />
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state--card">
            <span className="empty-state__icon"><Building2 size={32} /></span>
            <h3>Vous ne gérez encore aucune Escale</h3>
            <p>Vous pouvez ajouter votre établissement ou revendiquer une fiche déjà existante depuis la carte publique.</p>
            <div className="button-row">
              <button className="button button--primary" type="button" onClick={() => setShowCreate(true)}><Plus size={18} /> Ajouter mon établissement</button>
              <Link className="button button--secondary" to="/">Voir la carte</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function CreateOwnedPlaceForm({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState<AddressSuggestion | null>(null)
  const [description, setDescription] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleAmenity = (code: string) => {
    setAmenities((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!address) {
      setError('Merci de sélectionner une adresse dans les résultats de recherche.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createOwnedPlace({
        name: name.trim(),
        address: address.label,
        postalCode: address.postalCode ?? '',
        city: address.city ?? '',
        latitude: address.latitude,
        longitude: address.longitude,
        description: description.trim() || undefined,
        amenityCodes: amenities,
      })
      await onCreated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de créer ce lieu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form-card form-card--dashboard" onSubmit={submit}>
      <div className="form-card__heading">
        <div>
          <span className="eyebrow">Nouvel établissement</span>
          <h2>Créer ma fiche</h2>
          <p>La fiche sera visible dans votre espace immédiatement, puis publiée sur la carte après validation.</p>
        </div>
      </div>
      <div className="two-column-form">
        <label>
          Nom de l’établissement <span className="required">*</span>
          <input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Adresse <span className="required">*</span>
          <AddressSearch onSelect={setAddress} onLocate={() => undefined} />
        </label>
      </div>
      <label>
        Description ou modalités particulières <span className="optional">facultatif</span>
        <textarea rows={3} maxLength={1500} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div>
        <span className="label-text">Services proposés</span>
        <div className="amenity-selector amenity-selector--compact">
          {AMENITIES.map((amenity) => (
            <button
              key={amenity.code}
              type="button"
              className={amenities.includes(amenity.code) ? 'amenity-option amenity-option--active' : 'amenity-option'}
              onClick={() => toggleAmenity(amenity.code)}
            >
              <AmenityIcon name={amenity.icon} size={19} />
              <span>{amenity.label}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <button className="button button--primary" type="submit" disabled={submitting || !name.trim() || !address}>
        <Plus size={18} /> {submitting ? 'Création…' : 'Créer la fiche'}
      </button>
    </form>
  )
}
