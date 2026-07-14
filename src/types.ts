export type PlaceStatus = 'open' | 'conditional' | 'unconfirmed' | 'closed'
export type VerificationStatus = 'unverified' | 'community' | 'verified'
export type AvailabilityMode = 'always' | 'heatwave' | 'manual'
export type PublicationStatus = 'pending' | 'published' | 'rejected' | 'archived'
export type SubmissionKind = 'new_place' | 'correction' | 'report'

export type AmenityCode =
  | 'cooled_space'
  | 'seating'
  | 'drinking_water'
  | 'staff_help'
  | 'accessible'
  | 'toilets'
  | 'phone_charging'

export interface Amenity {
  code: AmenityCode | string
  label: string
  icon: string
}

export interface OpeningPeriod {
  id?: string
  weekday: number
  opens: string
  closes: string
  note?: string | null
}

export interface PlacePost {
  id: string
  title?: string | null
  body: string
  startsAt?: string | null
  expiresAt?: string | null
  createdAt: string
}

export interface Place {
  id: string
  slug: string
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
  photoUrl?: string | null
  description?: string | null
  status: PlaceStatus
  verificationStatus: VerificationStatus
  availabilityMode: AvailabilityMode
  publicationStatus?: PublicationStatus
  amenities: Amenity[]
  openingPeriods: OpeningPeriod[]
  posts: PlacePost[]
  updatedAt: string
  distanceKm?: number
}

export interface AddressSuggestion {
  id: string
  label: string
  city?: string
  postalCode?: string
  latitude: number
  longitude: number
}

export interface PublicSubmissionInput {
  kind: SubmissionKind
  placeId?: string
  payload: Record<string, unknown>
  contactEmail?: string
  turnstileToken?: string
}

export interface SessionProfile {
  id: string
  displayName?: string | null
  role: 'user' | 'moderator' | 'admin'
}

export interface ManagedPlace {
  placeId: string
  memberRole: 'owner' | 'manager' | 'editor'
  place: Place
}
