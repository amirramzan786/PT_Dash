import { createAdminClient, createAuthClient } from '../_shared/supabase.ts'
import { jsonResponse, preflightResponse, requestOrigin } from '../_shared/http.ts'
import { sendBetaOutcomeEmail } from '../_shared/betaOutcomeEmail.ts'

Deno.serve(async (request) => {
  const origin = requestOrigin(request)
  if (origin === null) return new Response(JSON.stringify({ error: 'This origin is not allowed.' }), { status: 403 })
  if (request.method === 'OPTIONS') return preflightResponse(origin)
  if (request.method !== 'POST') return jsonResponse(origin, 405, { error: 'Use POST to complete verification.' })
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token) return jsonResponse(origin, 401, { error: 'Please open the verification email again.', code: 'UNAUTHENTICATED' })

  try {
    const authClient = createAuthClient(token)
    const { data, error: userError } = await authClient.auth.getUser(token)
    if (userError || !data.user || !data.user.email) return jsonResponse(origin, 401, { error: 'Please open the verification email again.', code: 'UNAUTHENTICATED' })
    if (!data.user.email_confirmed_at) return jsonResponse(origin, 403, { error: 'Confirm your email before continuing.', code: 'EMAIL_NOT_VERIFIED' })

    const admin = createAdminClient()
    const { data: result, error } = await admin.rpc('complete_beta_verification', {
      p_user_id: data.user.id,
      p_email: data.user.email,
    })
    if (error) {
      if (error.code === 'P0002') return jsonResponse(origin, 404, { error: 'This account is not linked to a beta access request.', code: 'NO_BETA_SIGNUP' })
      if (error.code === '22023' && error.message?.toLowerCase().includes('expired')) {
        return jsonResponse(origin, 410, { error: 'This verification link has expired. Request a fresh beta email to continue.', code: 'VERIFICATION_EXPIRED' })
      }
      throw error
    }
    const foundingNumber = result?.founding_number == null ? null : Number(result.founding_number)
    const { data: signup, error: signupError } = await admin
      .from('beta_signups')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle()
    if (signupError || !signup) throw signupError || new Error('Verified beta signup was not found.')

    // Outcome email delivery is intentionally non-blocking: allocation and
    // entitlement have already committed, and a provider outage must never
    // turn a valid Founder into an apparent failure.
    try {
      await sendBetaOutcomeEmail(admin, { signupId: signup.id, email: data.user.email, foundingNumber })
    } catch (emailError) {
      console.warn('beta outcome email failed', emailError instanceof Error ? emailError.name : 'unknown_error')
    }
    return jsonResponse(origin, 200, {
      ok: true,
      status: result?.status,
      foundingNumber,
      capacity: 20,
      message: foundingNumber
        ? `You’re Founder #${String(foundingNumber).padStart(2, '0')} of 20.`
        : 'Your email is verified. You’re on the Steel beta waitlist.',
    })
  } catch (error) {
    console.error('beta-verify failed', error instanceof Error ? error.name : 'unknown_error')
    return jsonResponse(origin, 503, { error: 'We could not finish verification right now. Please try again.', code: 'UNAVAILABLE' })
  }
})
