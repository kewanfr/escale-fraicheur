import { Link } from 'react-router-dom'
import { Brand } from './Brand'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <Brand compact />
          <p>Une carte collaborative pour trouver rapidement un lieu frais et accueillant.</p>
        </div>
        <div className="site-footer__links">
          <Link to="/signaler">Signaler un lieu</Link>
          <Link to="/connexion">Espace établissement</Link>
        </div>
      </div>
    </footer>
  )
}
