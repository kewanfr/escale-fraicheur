import { Check, ChevronRight, Info, MapPin, Send, ShieldCheck } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch'
import { AmenityIcon } from '../components/AmenityIcon'
import { Notice } from '../components/Notice'
import { TurnstileWidget } from '../components/TurnstileWidget'
import { AMENITIES } from '../data/demo'
import { fetchPlaceBySlug, submitPublicContribution } from '../lib/api'
import type { AddressSuggestion, Place, SubmissionKind } from '../types'

export function SignalPage() {
  const [searchParams] = useSearchParams()
  const initialKind = searchParams.get('kind') === 'correction' ? 'correction' : 'new_place'
  const placeSlug = searchParams.get('place')
  const [kind, setKind] = useState<SubmissionKind>(initialKind)
  const [place, setPlace] = useState<Place | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState<AddressSuggestion | null>(null)
  const [amenities, setAmenities] = useState<string[]>([])
  const [hours, setHours] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [message, setMessage] = useState('')
  const [reason, setReason] = useState('horaires')
  const [contactEmail, setContactEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ id: string; demo?: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()

  useEffect(() => {
    if (!placeSlug) return
    fetchPlaceBySlug(placeSlug).then(setPlace).catch(() => undefined)
  }, [placeSlug])

  const isNewPlace = kind === 'new_place'
  const canSubmit = useMemo(() => {
    if (isNewPlace) return name.trim().length >= 2 && address !== null
    return Boolean(place?.id) && message.trim().length >= 5
  }, [isNewPlace, name, address, place, message])

  const toggleAmenity = (code: string) => {
    setAmenities((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Merci de compléter les informations obligatoires.')
      return
    }
    if (turnstileSiteKey && !turnstileToken) {
      setError('Merci de terminer la vérification anti-robot.')
      return
    }

    setSubmitting(true)
    try {
      const payload = isNewPlace
        ? {
            name: name.trim(),
            address: address?.label,
            city: address?.city ?? '',
            postal_code: address?.postalCode ?? '',
            latitude: address?.latitude,
            longitude: address?.longitude,
            amenity_codes: amenities,
            hours_note: hours.trim() || null,
            source_url: sourceUrl.trim() || null,
          }
        : {
            reason,
            message: message.trim(),
            source_url: sourceUrl.trim() || null,
          }

      const result = await submitPublicContribution({
        kind,
        placeId: place?.id,
        payload,
        contactEmail: contactEmail.trim() || undefined,
        turnstileToken: turnstileToken || undefined,
      })
      setSuccess(result)
    } catch (reasonValue) {
      console.error(reasonValue)
      setError(reasonValue instanceof Error ? reasonValue.message : 'Impossible d’envoyer votre signalement.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="container narrow-page page-shell">
        <div className="success-panel">
          <span className="success-panel__icon"><Check size={34} /></span>
          <span className="eyebrow">Merci pour votre contribution</span>
          <h1>Votre signalement a bien été reçu.</h1>
          <p>
            Il sera vérifié avant publication ou modification de la fiche. Aucun compte n’a été créé pour vous.
          </p>
          {success.demo && (
            <Notice tone="warning">
              Vous êtes en mode démonstration : le formulaire fonctionne visuellement, mais rien n’est enregistré tant que Supabase n’est pas configuré.
            </Notice>
          )}
          <Link className="button button--primary" to="/">Retour à la carte <ChevronRight size={18} /></Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container narrow-page page-shell signal-page">
      <div className="page-heading">
        <span className="eyebrow">Contribution sans compte</span>
        <h1>{isNewPlace ? 'Signaler une Escale Fraîcheur manquante' : 'Signaler une information incorrecte'}</h1>
        <p>Votre contribution est envoyée à la modération. Elle n’est jamais publiée automatiquement sans vérification.</p>
      </div>

      {!placeSlug && (
        <div className="segmented-control" role="tablist" aria-label="Type de signalement">
          <button className={kind === 'new_place' ? 'active' : ''} type="button" onClick={() => setKind('new_place')}>Nouveau lieu</button>
          <button className={kind !== 'new_place' ? 'active' : ''} type="button" onClick={() => setKind('report')}>Autre signalement</button>
        </div>
      )}

      {place && !isNewPlace && (
        <div className="selected-place-box">
          <MapPin size={20} />
          <div><strong>{place.name}</strong><span>{place.address}, {place.postalCode} {place.city}</span></div>
        </div>
      )}

      {!isNewPlace && !place && (
        <Notice tone="warning"><Info size={19} /> Ouvrez d’abord la fiche d’une Escale et cliquez sur « Signaler une erreur » pour identifier le lieu concerné.</Notice>
      )}

      <form className="form-card" onSubmit={submit}>
        {isNewPlace ? (
          <>
            <fieldset>
              <legend>1. Quel est ce lieu ?</legend>
              <label>
                Nom du lieu <span className="required">*</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex. Centre commercial Beaulieu" required />
              </label>
              <label>
                Adresse <span className="required">*</span>
                <AddressSearch onSelect={setAddress} onLocate={() => undefined} placeholder="Rechercher l’adresse exacte…" />
              </label>
              {address && (
                <div className="selected-address"><MapPin size={18} /><span><strong>{address.label}</strong><small>{address.latitude.toFixed(5)}, {address.longitude.toFixed(5)}</small></span></div>
              )}
            </fieldset>

            <fieldset>
              <legend>2. Que propose cette Escale ?</legend>
              <p className="field-help">Cochez uniquement ce que vous savez. Toutes les modalités peuvent être corrigées ensuite.</p>
              <div className="amenity-selector">
                {AMENITIES.slice(0, 6).map((amenity) => (
                  <button
                    className={amenities.includes(amenity.code) ? 'amenity-option amenity-option--active' : 'amenity-option'}
                    type="button"
                    key={amenity.code}
                    onClick={() => toggleAmenity(amenity.code)}
                    aria-pressed={amenities.includes(amenity.code)}
                  >
                    <AmenityIcon name={amenity.icon} size={22} />
                    <span>{amenity.label}</span>
                    {amenities.includes(amenity.code) && <Check size={17} />}
                  </button>
                ))}
              </div>
              <label>
                Horaires ou conditions connues <span className="optional">facultatif</span>
                <textarea value={hours} onChange={(event) => setHours(event.target.value)} maxLength={600} rows={3} placeholder="Ex. du lundi au samedi de 9 h 30 à 20 h, uniquement en cas d’alerte rouge…" />
              </label>
            </fieldset>
          </>
        ) : (
          <fieldset>
            <legend>Que souhaitez-vous signaler ?</legend>
            <label>
              Type de problème
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                <option value="horaires">Horaires incorrects</option>
                <option value="services">Services ou modalités incorrects</option>
                <option value="ferme">Le lieu semble fermé ou indisponible</option>
                <option value="adresse">Adresse ou position incorrecte</option>
                <option value="participation">Le lieu ne semble pas participer au dispositif</option>
                <option value="autre">Autre</option>
              </select>
            </label>
            <label>
              Expliquez-nous <span className="required">*</span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={5} maxLength={1200} rows={5} required placeholder="Décrivez précisément ce qui semble incorrect…" />
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend>{isNewPlace ? '3. Source et contact' : 'Source et contact'}</legend>
          <label>
            Lien vers une source ou une photo <span className="optional">facultatif</span>
            <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} maxLength={500} placeholder="https://…" />
          </label>
          <label>
            Votre e-mail <span className="optional">facultatif — uniquement pour vous recontacter</span>
            <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={254} placeholder="vous@exemple.fr" />
          </label>
          <div className="privacy-note"><ShieldCheck size={19} /><span>Aucun compte n’est créé. Votre adresse e-mail n’est pas affichée publiquement.</span></div>
        </fieldset>

        <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
        {error && <Notice tone="error">{error}</Notice>}

        <button className="button button--primary button--large button--full" type="submit" disabled={!canSubmit || submitting}>
          <Send size={19} /> {submitting ? 'Envoi en cours…' : 'Envoyer à la modération'}
        </button>
      </form>
    </main>
  )
}
