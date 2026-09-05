import { isDisposableEmail, normalizeEmail } from '../_shared/email.mjs'
import { clientIp, keyedHash } from '../_shared/rateLimit.ts'
import { createAdminClient, createAuthClient, publishableKey, supabaseUrl } from '../_shared/supabase.ts'
import { jsonResponse, preflightResponse, requestOrigin, safeSource } from '../_shared/http.ts'

const RESEND_COOLDOWN_SECONDS = 60
const EMAIL_LIMIT = 5
const IP_LIMIT = 20
const IP_WINDOW_SECONDS = 60 * 60
const EMAIL_WINDOW_SECONDS = 24 * 60 * 60

async function recordServerAnalytics(admin: ReturnType<typeof createAdminClient>, eventName: string, source: string, signupId?: string, properties: Record<string, string> = {}) {
  try {
    await admin.from('analytics_events').insert({ event_name: eventName, signup_id: signupId || null, source, properties })
  } catch {
    // Analytics must never change the access or verification outcome.
    console.warn('beta analytics unavailable')
  }
}

async function verifyTurnstile(request: Request, token: string, secret: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const payload: Record<string, string> = { secret, response: token }
    const ip = clientIp(request)
    if (ip !== 'unknown-client') payload.remoteip = ip
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) return false
    const result = await response.json() as { success?: boolean; hostname?: string }
    if (result.success !== true) return false
    const allowedHostnames = (Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES') || '')
      .split(',').map((hostname) => hostname.trim().toLowerCase()).filter(Boolean)
    // A configured secret without a hostname allow-list is too permissive:
    // a valid token minted for another host must never satisfy Steel's flow.
    return allowedHostnames.length > 0
      && typeof result.hostname === 'string'
      && allowedHostnames.includes(result.hostname.toLowerCase())
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function verificationRedirect(origin: string) {
  const configured = Deno.env.get('MARKETING_VERIFICATION_REDIRECT_URL')?.trim()
  if (configured) return configured
  return `${origin || 'https://project-steel-sitepagesdev.u1165153.workers.dev'}#beta-verified`
}

function publicStatus(admin: ReturnType<typeof createAdminClient>) {
  return admin.from('beta_signups')
    .select('founding_number', { count: 'exact', head: true })
    .in('status', ['verified', 'approved'])
    .not('founding_number', 'is', null)
    .then(({ count, error }) => {
      if (error) throw error
      const claimed = Math.min(20, count || 0)
      return { capacity: 20, claimed, remaining: 20 - claimed, full: claimed >= 20 }
    })
}

Deno.serve(async (request) => {
  const origin = requestOrigin(request)
  if (origin === null) return new Response(JSON.stringify({ error: 'This origin is not allowed.' }), { status: 403 })
  if (request.method === 'OPTIONS') return preflightResponse(origin)
  if (request.method !== 'POST') return jsonResponse(origin, 405, { error: 'Use POST for beta access requests.' })

  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY') || ''
  const serverUrl = supabaseUrl()
  const serverPublishableKey = publishableKey()
  if (!turnstileSecret || !serverUrl || !serverPublishableKey) {
    return jsonResponse(origin, 503, { error: 'Beta access is temporarily unavailable.', code: 'CONFIGURATION_ERROR' })
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > 8192) return jsonResponse(origin, 413, { error: 'That request is too large.', code: 'INVALID_REQUEST' })
    const body = await request.json() as { email?: unknown; turnstileToken?: unknown; turnstile_token?: unknown; source?: unknown }
    const requestedSource = safeSource(body.source)
    const source = requestedSource === 'hero' ? 'hero' : requestedSource === 'beta' ? 'beta-section' : 'marketing-site'
    const admin = createAdminClient()
    await recordServerAnalytics(admin, 'beta_signup_attempted', source)
    const email = normalizeEmail(body.email)
    if (!email) {
      await recordServerAnalytics(admin, 'beta_signup_rejected', source, undefined, { reason: 'invalid_email' })
      return jsonResponse(origin, 400, { error: 'Enter a valid email address.', code: 'INVALID_EMAIL' })
    }
    if (isDisposableEmail(email)) {
      await recordServerAnalytics(admin, 'beta_signup_rejected', source, undefined, { reason: 'disposable_email' })
      return jsonResponse(origin, 400, { error: 'Please use a regular email address for beta access.', code: 'DISPOSABLE_EMAIL' })
    }
    const turnstileToken = String(body.turnstileToken ?? body.turnstile_token ?? '').trim()
    if (!turnstileToken || turnstileToken.length > 2048 || !(await verifyTurnstile(request, turnstileToken, turnstileSecret))) {
      await recordServerAnalytics(admin, 'beta_signup_rejected', source, undefined, { reason: 'turnstile_failed' })
      return jsonResponse(origin, 400, { error: 'Please complete the human check and try again.', code: 'TURNSTILE_FAILED' })
    }

    const hashSalt = Deno.env.get('RATE_LIMIT_HASH_SALT') || turnstileSecret
    const [emailHash, ipHash] = await Promise.all([
      keyedHash(email, hashSalt),
      keyedHash(clientIp(request), hashSalt),
    ])
    for (const [scope, keyHash, limit, windowSeconds] of [
      ['email', emailHash, EMAIL_LIMIT, EMAIL_WINDOW_SECONDS],
      ['ip', ipHash, IP_LIMIT, IP_WINDOW_SECONDS],
    ] as const) {
      const { data: limitResult, error: limitError } = await admin.rpc('consume_beta_rate_limit', {
        p_scope: scope,
        p_key_hash: keyHash,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      })
      if (limitError) throw limitError
      if (!limitResult?.allowed) {
        await recordServerAnalytics(admin, 'beta_signup_rejected', source, undefined, { reason: 'rate_limited' })
        return jsonResponse(origin, 429, {
          error: 'Please wait a little before requesting another email.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: Math.min(3600, Number(limitResult.retry_after_seconds) || 60),
        })
      }
    }

    const { data: reservation, error: reservationError } = await admin.rpc('reserve_beta_signup_request', {
      p_email_normalized: email,
      p_source: source,
      p_cooldown_seconds: RESEND_COOLDOWN_SECONDS,
    })
    if (reservationError) throw reservationError
    if (!reservation?.allowed) {
      if (reservation.existing_status === 'pending') {
        return jsonResponse(origin, 429, {
          error: 'We already sent a verification email. Please check your inbox or try again shortly.',
          code: 'COOLDOWN',
          retryAfterSeconds: Number(reservation.retry_after_seconds) || RESEND_COOLDOWN_SECONDS,
        })
      }
      if (reservation.existing_status === 'rejected') {
        return jsonResponse(origin, 200, { ok: true, code: 'SUBMITTED', message: 'If this request can be accepted, we will email you.' })
      }
      return jsonResponse(origin, 200, { ok: true, code: 'DUPLICATE_VERIFIED', message: 'You’re already on the list.' })
    }

    const authClient = createAuthClient()
    const { error: otpError } = await authClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: verificationRedirect(origin),
        data: { beta_signup: true },
      },
    })
    if (otpError) {
      await admin.from('beta_signups').update({ last_request_at: null, updated_at: new Date().toISOString() }).eq('id', reservation.signup_id)
      throw otpError
    }

    const now = new Date().toISOString()
    await admin.from('beta_signups').update({
      verification_sent_at: now,
      verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now,
    }).eq('id', reservation.signup_id)
    // Operational measurement only: no email, IP address or other raw PII is
    // copied into analytics_events.
    await recordServerAnalytics(admin, 'verification_email_sent', source, reservation.signup_id)
    const status = await publicStatus(admin)
    return jsonResponse(origin, 200, {
      ok: true,
      code: 'SUBMITTED',
      message: 'Check your email to verify your place.',
      foundingFull: status.full,
    })
  } catch (error) {
    console.error('beta-signup failed', error instanceof Error ? error.name : 'unknown_error')
    return jsonResponse(origin, 503, { error: 'We could not send that email right now. Please try again later.', code: 'UNAVAILABLE' })
  }
})
