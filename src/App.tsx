import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { AdminPage } from './pages/AdminPage'
import { ClaimPage } from './pages/ClaimPage'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PlacePage } from './pages/PlacePage'
import { SignalPage } from './pages/SignalPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function NotFoundPage() {
  return (
    <main className="container page-shell empty-state">
      <h1>Page introuvable</h1>
      <p>Cette page n’existe pas ou a été déplacée.</p>
      <Link className="button button--primary" to="/">Retour à la carte</Link>
    </main>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lieu/:slug" element={<PlacePage />} />
        <Route path="/signaler" element={<SignalPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/revendiquer/:slug" element={<ClaimPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/administration" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </div>
  )
}
