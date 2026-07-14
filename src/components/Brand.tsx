import { Link } from 'react-router-dom'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? 'brand--compact' : ''}`} to="/" aria-label="Accueil Escale Fraîcheur">
      <svg className="brand__mark" viewBox="0 0 84 74" aria-hidden="true">
        <path d="M16 32a26 26 0 0 1 52 0" fill="none" stroke="#ff7b28" strokeWidth="5" strokeLinecap="round" />
        <path d="M23 32a19 19 0 0 1 38 0" fill="none" stroke="#ff7b28" strokeWidth="5" strokeLinecap="round" />
        <path d="M30 32a12 12 0 0 1 24 0" fill="none" stroke="#ff7b28" strokeWidth="5" strokeLinecap="round" />
        <path d="M42 21c-10.4 0-18.8 8.4-18.8 18.8 0 13.2 18.8 31.1 18.8 31.1s18.8-17.9 18.8-31.1C60.8 29.4 52.4 21 42 21Zm0 27.4a8.6 8.6 0 1 1 0-17.2 8.6 8.6 0 0 1 0 17.2Z" fill="#0db2e8" />
      </svg>
      <span className="brand__text">
        <span>ESCALE</span>
        <strong>FRAÎCHEUR</strong>
      </span>
    </Link>
  )
}
