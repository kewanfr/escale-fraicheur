import {
  Accessibility,
  Armchair,
  BadgeInfo,
  BatteryCharging,
  GlassWater,
  MessageCircle,
  Snowflake,
  Sparkles,
} from 'lucide-react'

const icons = {
  accessibility: Accessibility,
  armchair: Armchair,
  'badge-info': BadgeInfo,
  'battery-charging': BatteryCharging,
  'glass-water': GlassWater,
  'message-circle': MessageCircle,
  snowflake: Snowflake,
  sparkles: Sparkles,
}

export function AmenityIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Sparkles
  return <Icon size={size} strokeWidth={2.2} aria-hidden="true" />
}
