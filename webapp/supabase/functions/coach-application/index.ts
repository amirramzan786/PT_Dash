import { isDisposableEmail, normalizeEmail } from '../_shared/email.mjs'
import { clientIp, keyedHash } from '../_shared/rateLimit.ts'
import { createAdminClient } from '../_shared/supabase.ts'
import { jsonResponse, preflightResponse, requestOrigin, safeSource } from '../_shared/http.ts'

async function verifyTurnstile(request: Request, token: string, secret: string) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret, response: token, remoteip: clientIp(request) }) })
  const result = await response.json() as { success?: boolean, hostname?: string, action?: string }
  const hosts = (Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES') || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  return response.ok && result.success === true && result.action === 'coach_application' && !!result.hostname && hosts.includes(result.hostname.toLowerCase())
}

Deno.serve(async (request) => {
  const origin = requestOrigin(request)
  if (origin === null) return new Response(JSON.stringify({ error: 'This origin is not allowed.' }), { status: 403 })
  if (request.method === 'OPTIONS') return preflightResponse(origin)
  if (request.method !== 'POST') return jsonResponse(origin, 405, { error: 'Use POST for Coach applications.' })
  try {
    if (Number(request.headers.get('content-length') || 0) > 12288) return jsonResponse(origin, 413, { error: 'That application is too large.' })
    const body = await request.json() as Record<string, unknown>
    const email = normalizeEmail(body.email)
    const fullName = String(body.fullName || '').trim()
    const headline = String(body.headline || '').trim()
    const bio = String(body.bio || '').trim()
    const specialties = Array.isArray(body.specialties) ? body.specialties.map((item) => String(item).trim()).filter(Boolean).slice(0, 6) : []
    const acknowledged = ['qualificationDeclaration', 'insuranceDeclaration', 'rightToCoachDeclaration', 'safeguardingAcknowledged', 'privacyAiAgreementAcknowledged', 'termsAcknowledged'].every((key) => body[key] === true)
    if (!email || isDisposableEmail(email) || fullName.length < 2 || headline.length < 8 || bio.length < 80 || !specialties.length || !acknowledged) return jsonResponse(origin, 400, { error: 'Complete the required application fields using a regular email address.' })
    const token = String(body.turnstileToken || '').trim()
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY') || ''
    if (!secret || !token || !(await verifyTurnstile(request, token, secret))) return jsonResponse(origin, 400, { error: 'Please complete the human check and try again.' })
    const admin = createAdminClient()
    const salt = Deno.env.get('RATE_LIMIT_HASH_SALT') || secret
    const { data: permitted, error: limitError } = await admin.rpc('consume_beta_rate_limit', { p_scope: 'ip', p_key_hash: await keyedHash(`coach-application:${clientIp(request)}`, salt), p_limit: 10, p_window_seconds: 3600 })
    if (limitError) throw limitError
    if (!permitted?.allowed) return jsonResponse(origin, 429, { error: 'Please wait before sending another application.' })
    const { error } = await admin.from('coach_applications').insert({ full_name: fullName, email, location: String(body.location || '').trim() || null, headline, bio, specialties, coaching_style: String(body.coachingStyle || '').trim() || null, ideal_client: String(body.idealClient || '').trim() || null, availability_note: String(body.availabilityNote || '').trim() || null, qualification_declaration: true, insurance_declaration: true, right_to_coach_declaration: true, safeguarding_acknowledged: true, privacy_ai_agreement_acknowledged: true, terms_acknowledged: true, source: safeSource(body.source) })
    if (error && error.code === '23505') return jsonResponse(origin, 200, { ok: true, message: 'Your application is already in Steel’s review queue.' })
    if (error) throw error
    return jsonResponse(origin, 200, { ok: true, message: 'Application received. Steel will review it and contact you about the next step.' })
  } catch (error) {
    console.error('coach application failed', error instanceof Error ? error.name : 'unknown')
    return jsonResponse(origin, 503, { error: 'We could not submit your application right now. Please try again.' })
  }
})
