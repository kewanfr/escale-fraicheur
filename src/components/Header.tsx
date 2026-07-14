import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brand } from './Brand'

export function Header() {
  const [open, setOpen] = useState(false)
  const { user, profile } = useAuth()

  const close = () => setOpen(false)

  return (
    <header className="site-header">
      <div className="site-header__inner container">
        <Brand compact />
        <button
          className="icon-button site-header__menu"
          type="button"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
        <nav className={`site-nav ${open ? 'site-nav--open' : ''}`} aria-label="Navigation principale">
          <NavLink to="/" onClick={close}>Trouver une escale</NavLink>
          <NavLink to="/signaler" onClick={close}>Signaler un lieu</NavLink>
          {user ? (
            <Link className="button button--small button--secondary" to="/dashboard" onClick={close}>
              {profile?.role === 'admin' ? 'Administration' : 'Mon espace'}
            </Link>
          ) : (
            <Link className="button button--small button--secondary" to="/connexion" onClick={close}>
              Espace établissement
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
