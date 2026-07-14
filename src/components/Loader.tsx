export function Loader({ label = 'Chargement…' }: { label?: string }) {
  return <div className="loader"><span className="loader__spinner" aria-hidden="true" /> <span>{label}</span></div>
}
