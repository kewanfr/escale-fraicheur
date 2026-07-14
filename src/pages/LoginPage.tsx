import { Building2, Mail, ShieldCheck } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Notice } from '../components/Notice'
import { useAuth } from '../context/AuthContext'
import { signInWithEmail, signInWithGoogle } from '../lib/api'

export function LoginPage() {
  const { user, configured, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) return <Navigate to={redirect} replace />

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSending(true)
    try {
      await signInWithEmail(email)
      setMessage('Un lien de connexion vient de vous être envoyé. Consultez votre boîte mail.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’envoyer le lien de connexion.')
    } finally {
      setSending(false)
    }
  }

  const submitGoogle = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de lancer la connexion Google.')
    }
  }

  return (
    <main className="container narrow-page page-shell auth-page">
      <div className="auth-card">
        <span className="auth-card__icon"><Building2 size={30} /></span>
        <span className="eyebrow">Espace établissement</span>
        <h1>Gérez votre Escale Fraîcheur</h1>
        <p>La consultation et les signalements publics restent accessibles sans compte. La connexion sert uniquement à gérer officiellement un lieu.</p>

        {!configured && (
          <Notice tone="warning">
            Le site est actuellement en mode démonstration. Configurez Supabase pour activer les comptes et l’espace établissement.
          </Notice>
        )}

        <button className="button button--google button--full" type="button" onClick={submitGoogle} disabled={!configured}>
          <span className="google-mark" aria-hidden="true">G</span>
          Continuer avec Google
        </button>

        <div className="auth-divider"><span>ou</span></div>

        <form onSubmit={submitEmail}>
          <label>
            Adresse e-mail professionnelle ou personnelle
            <div className="input-with-icon"><Mail size={19} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.fr" /></div>
          </label>
          <button className="button button--primary button--full" type="submit" disabled={!configured || sending}>
            {sending ? 'Envoi…' : 'Recevoir un lien de connexion'}
          </button>
        </form>

        {message && <Notice tone="success">{message}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <div className="privacy-note"><ShieldCheck size={19} /><span>Aucun mot de passe n’est stocké par l’application.</span></div>
      </div>
    </main>
  )
}
