import { createClient } from 'npm:@supabase/supabase-js@2.110.5'

const MAX_BODY_BYTES = 24_000
const validKinds = new Set(['new_place', 'correction', 'report'])

function allowedOrigin(requestOrigin: string | null) {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (configured.includes('*')) return requestOrigin ?? '*'
  if (requestOrigin && configured.includes(requestOrigin)) return requestOrigin
  return configured[0] ?? 'null'
}

function corsHeaders(request: Request) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(request.headers.get('origin')),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isHttpUrl(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string' || value.length > 500) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateNewPlace(payload: Record<string, unknown>) {
  if (typeof payload.name !== 'string' || payload.name.trim().length < 2 || payload.name.length > 120) {
    throw new Error('Nom du lieu invalide')
  }
  if (typeof payload.address !== 'string' || payload.address.trim().length < 3 || payload.address.length > 300) {
    throw new Error('Adresse invalide')
  }
  const latitude = Number(payload.latitude)
  const longitude = Number(payload.longitude)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Coordonnées invalides')
  }
  if (payload.hours_note && (typeof payload.hours_note !== 'string' || payload.hours_note.length > 600)) {
    throw new Error('Horaires trop longs')
  }
  if (!isHttpUrl(payload.source_url)) throw new Error('URL de source invalide')
  if (payload.amenity_codes && (!Array.isArray(payload.amenity_codes) || payload.amenity_codes.length > 20)) {
    throw new Error('Liste de services invalide')
  }
}

function validateCorrection(payload: Record<string, unknown>) {
  if (typeof payload.message !== 'string' || payload.message.trim().length < 5 || payload.message.length > 1200) {
    throw new Error('Le message doit contenir entre 5 et 1200 caractères')
  }
  if (payload.reason && (typeof payload.reason !== 'string' || payload.reason.length > 80)) {
    throw new Error('Motif invalide')
  }
  if (!isHttpUrl(payload.source_url)) throw new Error('URL de source invalide')
}

async function verifyTurnstile(token: string | undefined, remoteIp: string | null) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return true
  if (!token) return false

  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (remoteIp) form.append('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
  if (!response.ok) return false
  const result = await response.json() as { success?: boolean }
  return result.success === true
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(request) })
  }
  if (request.method !== 'POST') return json(request, 405, { error: 'Method not allowed' })

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return json(request, 413, { error: 'Payload too large' })

  try {
    const body = await request.json() as {
      kind?: string
      placeId?: string
      payload?: Record<string, unknown>
      contactEmail?: string
      turnstileToken?: string
    }

    if (!body.kind || !validKinds.has(body.kind)) return json(request, 400, { error: 'Invalid kind' })
    if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
      return json(request, 400, { error: 'Invalid payload' })
    }
    if (body.contactEmail && !isEmail(body.contactEmail)) return json(request, 400, { error: 'Invalid email' })
    if (body.kind !== 'new_place' && !body.placeId) return json(request, 400, { error: 'placeId required' })

    if (body.kind === 'new_place') validateNewPlace(body.payload)
    else validateCorrection(body.payload)

    const remoteIp = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const human = await verifyTurnstile(body.turnstileToken, remoteIp)
    if (!human) return json(request, 403, { error: 'Vérification anti-robot invalide' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase function secrets are missing')

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await admin
      .from('public_submissions')
      .insert({
        kind: body.kind,
        place_id: body.placeId ?? null,
        payload: body.payload,
        contact_email: body.contactEmail?.trim() || null,
      })
      .select('id')
      .single()

    if (error) throw error
    return json(request, 201, { id: data.id })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = /invalide|invalid|doit contenir|trop long/i.test(message) ? 400 : 500
    return json(request, status, { error: message })
  }
})
