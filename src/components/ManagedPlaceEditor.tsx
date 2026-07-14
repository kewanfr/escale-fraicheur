import { Camera, Check, Megaphone, Save } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { AMENITIES } from '../data/demo'
import { addPlacePost, replacePlaceAmenities, updateManagedPlace, uploadPlacePhoto } from '../lib/api'
import type { ManagedPlace } from '../types'
import { AmenityIcon } from './AmenityIcon'
import { Notice } from './Notice'
import { StatusBadge } from './StatusBadge'

interface ManagedPlaceEditorProps {
  managed: ManagedPlace
  onSaved: () => Promise<void> | void
}

export function ManagedPlaceEditor({ managed, onSaved }: ManagedPlaceEditorProps) {
  const { place } = managed
  const [description, setDescription] = useState(place.description ?? '')
  const [status, setStatus] = useState(place.status)
  const [availabilityMode, setAvailabilityMode] = useState(place.availabilityMode)
  const [amenityCodes, setAmenityCodes] = useState(place.amenities.map((item) => item.code))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [postBody, setPostBody] = useState('')
  const [postExpiry, setPostExpiry] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleAmenity = (code: string) => {
    setAmenityCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      let photoUrl = place.photoUrl ?? null
      if (photoFile) {
        if (photoFile.size > 5 * 1024 * 1024) throw new Error('La photo doit peser moins de 5 Mo.')
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) {
          throw new Error('Formats acceptés : JPG, PNG ou WebP.')
        }
        photoUrl = await uploadPlacePhoto(place.id, photoFile)
      }

      await Promise.all([
        updateManagedPlace(place.id, {
          description: description.trim() || null,
          current_status: status,
          availability_mode: availabilityMode,
          photo_url: photoUrl,
        }),
        replacePlaceAmenities(place.id, amenityCodes),
      ])
      setMessage('Les informations ont été mises à jour.')
      setPhotoFile(null)
      await onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’enregistrer les modifications.')
    } finally {
      setSaving(false)
    }
  }

  const publishPost = async (event: FormEvent) => {
    event.preventDefault()
    if (postBody.trim().length < 3) return
    setPublishing(true)
    setMessage(null)
    setError(null)
    try {
      await addPlacePost(place.id, postBody.trim(), postExpiry ? new Date(postExpiry).toISOString() : null)
      setPostBody('')
      setPostExpiry('')
      setMessage('L’actualité a été publiée.')
      await onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de publier cette actualité.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="managed-editor">
      <div className="managed-editor__header">
        <div>
          <div className="managed-editor__badges">
            <StatusBadge status={place.status} />
            <span className="role-chip">{managed.memberRole === 'owner' ? 'Propriétaire' : managed.memberRole === 'manager' ? 'Gestionnaire' : 'Éditeur'}</span>
            {place.publicationStatus === 'pending' && <span className="pending-chip">En attente de validation</span>}
          </div>
          <h2>{place.name}</h2>
          <p>{place.address}, {place.postalCode} {place.city}</p>
        </div>
        {place.photoUrl && <img className="managed-editor__photo" src={place.photoUrl} alt="" />}
      </div>

      <div className="dashboard-editor-grid">
        <form className="dashboard-panel" onSubmit={save}>
          <h3>Informations de l’Escale</h3>
          <label>
            État actuel
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="open">Ouverte actuellement</option>
              <option value="conditional">Ouverture conditionnelle</option>
              <option value="unconfirmed">Information à confirmer</option>
              <option value="closed">Temporairement indisponible</option>
            </select>
          </label>
          <label>
            Mode d’activation
            <select value={availabilityMode} onChange={(event) => setAvailabilityMode(event.target.value as typeof availabilityMode)}>
              <option value="always">Toujours disponible selon les horaires</option>
              <option value="heatwave">Seulement lors des épisodes de forte chaleur</option>
              <option value="manual">Activation manuelle</option>
            </select>
          </label>
          <label>
            Description / modalités particulières
            <textarea rows={4} value={description} maxLength={1500} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div>
            <span className="label-text">Services proposés</span>
            <div className="amenity-selector amenity-selector--compact">
              {AMENITIES.map((amenity) => (
                <button
                  key={amenity.code}
                  type="button"
                  className={amenityCodes.includes(amenity.code) ? 'amenity-option amenity-option--active' : 'amenity-option'}
                  onClick={() => toggleAmenity(amenity.code)}
                  aria-pressed={amenityCodes.includes(amenity.code)}
                >
                  <AmenityIcon name={amenity.icon} size={19} />
                  <span>{amenity.label}</span>
                  {amenityCodes.includes(amenity.code) && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
          <label className="file-field">
            <Camera size={19} /> Photo du lieu <span className="optional">JPG, PNG ou WebP — 5 Mo max.</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
          </label>
          {message && <Notice tone="success">{message}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          <button className="button button--primary" type="submit" disabled={saving}>
            <Save size={18} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        <form className="dashboard-panel dashboard-panel--accent" onSubmit={publishPost}>
          <span className="dashboard-panel__icon"><Megaphone size={24} /></span>
          <h3>Publier une information temporaire</h3>
          <p>Exemple : changement exceptionnel d’horaires, espace complet, indisponibilité de l’eau ou ouverture prolongée.</p>
          <label>
            Message
            <textarea rows={5} value={postBody} minLength={3} maxLength={1200} required onChange={(event) => setPostBody(event.target.value)} placeholder="Votre information…" />
          </label>
          <label>
            Expiration automatique <span className="optional">facultatif</span>
            <input type="datetime-local" value={postExpiry} onChange={(event) => setPostExpiry(event.target.value)} />
          </label>
          <button className="button button--secondary" type="submit" disabled={publishing || postBody.trim().length < 3}>
            <Megaphone size={18} /> {publishing ? 'Publication…' : 'Publier l’information'}
          </button>
        </form>
      </div>
    </div>
  )
}
