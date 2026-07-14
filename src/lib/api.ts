import { AMENITIES, demoPlaces } from '../data/demo'
import type {
  Amenity,
  ManagedPlace,
  OpeningPeriod,
  Place,
  PlacePost,
  PublicSubmissionInput,
  SessionProfile,
} from '../types'
import { isSupabaseConfigured, requireSupabase, supabase } from './supabase'

const placeSelect = `
  id,
  slug,
  name,
  address_line,
  postal_code,
  city,
  country,
  latitude,
  longitude,
  photo_url,
  description,
  current_status,
  verification_status,
  availability_mode,
  publication_status,
  updated_at,
  place_amenities(amenities(code,label,icon)),
  opening_periods(id,weekday,opens,closes,note),
  place_posts(id,title,body,starts_at,expires_at,created_at)
`

function mapAmenity(value: any): Amenity | null {
  const raw = value?.amenities ?? value
  if (!raw?.code || !raw?.label) return null
  return {
    code: raw.code,
    label: raw.label,
    icon: raw.icon ?? 'sparkles',
  }
}

function mapOpeningPeriod(value: any): OpeningPeriod | null {
  if (typeof value?.weekday !== 'number' || !value?.opens || !value?.closes) return null
  return {
    id: value.id,
    weekday: value.weekday,
    opens: String(value.opens),
    closes: String(value.closes),
    note: value.note,
  }
}

function mapPost(value: any): PlacePost | null {
  if (!value?.id || !value?.body || !value?.created_at) return null
  return {
    id: value.id,
    title: value.title,
    body: value.body,
    startsAt: value.starts_at,
    expiresAt: value.expires_at,
    createdAt: value.created_at,
  }
}

export function mapPlaceRow(row: any): Place {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address_line,
    postalCode: row.postal_code,
    city: row.city,
    country: row.country ?? 'France',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    photoUrl: row.photo_url,
    description: row.description,
    status: row.current_status,
    verificationStatus: row.verification_status,
    availabilityMode: row.availability_mode,
    publicationStatus: row.publication_status,
    amenities: (row.place_amenities ?? []).map(mapAmenity).filter(Boolean),
    openingPeriods: (row.opening_periods ?? []).map(mapOpeningPeriod).filter(Boolean),
    posts: (row.place_posts ?? [])
      .map(mapPost)
      .filter(Boolean)
      .sort((a: PlacePost, b: PlacePost) => b.createdAt.localeCompare(a.createdAt)),
    updatedAt: row.updated_at,
  }
}

export async function fetchPublicPlaces(): Promise<Place[]> {
  if (!isSupabaseConfigured) return demoPlaces

  const client = requireSupabase()
  const { data, error } = await client
    .from('places')
    .select(placeSelect)
    .eq('publication_status', 'published')
    .order('name')

  if (error) throw error
  return (data ?? []).map(mapPlaceRow)
}

export async function fetchPlaceBySlug(slug: string): Promise<Place | null> {
  if (!isSupabaseConfigured) return demoPlaces.find((place) => place.slug === slug) ?? null

  const client = requireSupabase()
  const { data, error } = await client
    .from('places')
    .select(placeSelect)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data ? mapPlaceRow(data) : null
}

export async function submitPublicContribution(input: PublicSubmissionInput) {
  if (!isSupabaseConfigured) {
    await new Promise((resolve) => window.setTimeout(resolve, 650))
    return { id: `demo-${crypto.randomUUID()}`, demo: true }
  }

  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('public-submission', { body: input })
  if (error) throw error
  return data as { id: string; demo?: boolean }
}

export async function fetchAmenities(): Promise<Amenity[]> {
  if (!isSupabaseConfigured) return AMENITIES
  const client = requireSupabase()
  const { data, error } = await client.from('amenities').select('code,label,icon').order('sort_order')
  if (error) throw error
  return (data ?? []) as Amenity[]
}

export async function fetchMyProfile(userId: string): Promise<SessionProfile | null> {
  if (!isSupabaseConfigured) return null
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id,display_name,role')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id, displayName: data.display_name, role: data.role }
}

export async function fetchManagedPlaces(): Promise<ManagedPlace[]> {
  if (!isSupabaseConfigured) return []
  const client = requireSupabase()
  const { data, error } = await client
    .from('place_members')
    .select(`place_id,role,places(${placeSelect})`)
    .order('created_at')

  if (error) throw error
  return (data ?? [])
    .map((row: any) => {
      const rawPlace = Array.isArray(row.places) ? row.places[0] : row.places
      if (!rawPlace) return null
      return {
        placeId: row.place_id,
        memberRole: row.role,
        place: mapPlaceRow(rawPlace),
      } satisfies ManagedPlace
    })
    .filter((value): value is ManagedPlace => Boolean(value))
}

export async function requestClaim(placeId: string, message: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('claims')
    .insert({ place_id: placeId, message: message.trim() || null })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export interface CreateOwnedPlaceInput {
  name: string
  address: string
  postalCode: string
  city: string
  latitude: number
  longitude: number
  description?: string
  amenityCodes: string[]
}

export async function createOwnedPlace(input: CreateOwnedPlaceInput) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('create_owned_place', {
    p_name: input.name,
    p_address_line: input.address,
    p_postal_code: input.postalCode,
    p_city: input.city,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_description: input.description || null,
    p_amenity_codes: input.amenityCodes,
  })
  if (error) throw error
  return data as string
}

export async function updateManagedPlace(
  placeId: string,
  patch: Partial<{
    name: string
    description: string | null
    photo_url: string | null
    current_status: string
    availability_mode: string
  }>,
) {
  const client = requireSupabase()
  const { error } = await client.from('places').update(patch).eq('id', placeId)
  if (error) throw error
}

export async function replacePlaceAmenities(placeId: string, amenityCodes: string[]) {
  const client = requireSupabase()
  const { error } = await client.rpc('replace_place_amenities', {
    p_place_id: placeId,
    p_amenity_codes: amenityCodes,
  })
  if (error) throw error
}

export async function addPlacePost(placeId: string, body: string, expiresAt?: string | null) {
  const client = requireSupabase()
  const { error } = await client.from('place_posts').insert({
    place_id: placeId,
    body,
    expires_at: expiresAt || null,
  })
  if (error) throw error
}

export async function uploadPlacePhoto(placeId: string, file: File) {
  const client = requireSupabase()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
  const path = `${placeId}/${crypto.randomUUID()}.${safeExt}`
  const { error } = await client.storage.from('place-media').upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = client.storage.from('place-media').getPublicUrl(path)
  return data.publicUrl
}

export interface ModerationData {
  submissions: any[]
  claims: any[]
  pendingPlaces: Place[]
}

export async function fetchModerationData(): Promise<ModerationData> {
  const client = requireSupabase()
  const [submissionsResult, claimsResult, placesResult] = await Promise.all([
    client.from('public_submissions').select('*').eq('status', 'pending').order('created_at'),
    client
      .from('claims')
      .select('*,places(id,name,slug,address_line,city,postal_code)')
      .eq('status', 'pending')
      .order('created_at'),
    client.from('places').select(placeSelect).eq('publication_status', 'pending').order('created_at'),
  ])

  if (submissionsResult.error) throw submissionsResult.error
  if (claimsResult.error) throw claimsResult.error
  if (placesResult.error) throw placesResult.error

  return {
    submissions: submissionsResult.data ?? [],
    claims: claimsResult.data ?? [],
    pendingPlaces: (placesResult.data ?? []).map(mapPlaceRow),
  }
}

export async function moderateSubmission(id: string, decision: 'approve' | 'reject') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('moderate_public_submission', {
    p_submission_id: id,
    p_decision: decision,
  })
  if (error) throw error
  return data
}

export async function moderateClaim(id: string, decision: 'approve' | 'reject') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('moderate_claim', {
    p_claim_id: id,
    p_decision: decision,
  })
  if (error) throw error
  return data
}

export async function moderatePlace(id: string, decision: 'approve' | 'reject') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('moderate_place', {
    p_place_id: id,
    p_decision: decision,
  })
  if (error) throw error
  return data
}

export async function signInWithEmail(email: string) {
  const client = requireSupabase()
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}dashboard`
  const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  if (error) throw error
}

export async function signInWithGoogle() {
  const client = requireSupabase()
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}dashboard`
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
