import type { PlaceStatus } from '../types'
import { statusLabel } from '../lib/format'

export function StatusBadge({ status }: { status: PlaceStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabel(status)}</span>
}
