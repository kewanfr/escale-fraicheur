import { Link } from 'react-router-dom'
import { Brand } from './Brand'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <Brand compact />
          <p>Une carte collaborative pour trouver les Escales Fraîcheur et leurs services.</p>
        </div>
        <nav className="site-footer__links" aria-label="Liens de pied de page">
          <Link to="/">Carte</Link>
          <Link to="/signaler">Signaler un lieu</Link>
          <Link to="/connexion">Espace établissement</Link>
        </nav>
      </div>
    </footer>
  )
}
