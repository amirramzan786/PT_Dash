import { createAdminClient, createAuthClient } from '../_shared/supabase.ts'
import { jsonResponse, preflightResponse, requestOrigin } from '../_shared/http.ts'

function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || ''
  return value.replace(/^Bearer\s+/i, '').trim()
}

async function requireAdmin(request: Request) {
  const token = bearerToken(request)
  if (!token) return null
  const authClient = createAuthClient(token)
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) return null
  const admin = createAdminClient()
  const { data: role, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
  if (roleError || role?.role !== 'admin') return null
  return { admin, user: data.user }
}

Deno.serve(async (request) => {
  const origin = requestOrigin(request)
  if (origin === null) return new Response(JSON.stringify({ error: 'This origin is not allowed.' }), { status: 403 })
  if (request.method === 'OPTIONS') return preflightResponse(origin)
  const context = await requireAdmin(request)
  if (!context) return jsonResponse(origin, 403, { error: 'Admin access is required.', code: 'FORBIDDEN' })

  try {
    if (request.method === 'GET') {
      const { data, error } = await context.admin.from('beta_signups')
        .select('id,email,status,founding_number,user_id,source,created_at,verified_at,approved_at,updated_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return jsonResponse(origin, 200, { signups: data || [] })
    }
    if (request.method !== 'POST') return jsonResponse(origin, 405, { error: 'Use GET or POST.' })
    const body = await request.json() as { id?: unknown; action?: unknown }
    const id = String(body.id || '').trim()
    const action = String(body.action || '').trim().toLowerCase()
    if (!id || !['approve', 'reject', 'reconcile'].includes(action)) return jsonResponse(origin, 400, { error: 'Invalid admin action.', code: 'INVALID_REQUEST' })
    const { data: signup, error: signupError } = await context.admin.from('beta_signups').select('*').eq('id', id).maybeSingle()
    if (signupError || !signup) return jsonResponse(origin, 404, { error: 'Signup not found.', code: 'NOT_FOUND' })
    if (action === 'reject') {
      const update: Record<string, unknown> = { status: 'rejected', updated_at: new Date().toISOString() }
      const wasAllocatedFounder = signup.founding_number != null && ['verified', 'approved'].includes(signup.status)
      if (wasAllocatedFounder) update.founding_number = null
      const { error } = await context.admin.from('beta_signups').update(update).eq('id', id)
      if (error) throw error
      if (wasAllocatedFounder && signup.user_id) {
        const { error: entitlementError } = await context.admin.from('membership_entitlements')
          .delete()
          .eq('user_id', signup.user_id)
          .eq('plan_key', 'steel-core-premium-founder-lifetime')
        if (entitlementError) throw entitlementError
      }
      return jsonResponse(origin, 200, { ok: true, status: 'rejected' })
    }
    if (!signup.user_id || !signup.verified_at || !['verified', 'approved'].includes(signup.status)) {
      return jsonResponse(origin, 409, { error: 'Only an email-verified signup linked to an account can be approved or reconciled.', code: 'NOT_VERIFIED' })
    }
    const { data: authUser, error: authError } = await context.admin.auth.admin.getUserById(signup.user_id)
    if (authError || !authUser.user?.email_confirmed_at) return jsonResponse(origin, 409, { error: 'The linked account email is not confirmed.', code: 'NOT_VERIFIED' })
    if (action === 'approve') {
      const { error } = await context.admin.from('beta_signups').update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      return jsonResponse(origin, 200, { ok: true, status: 'approved', foundingNumber: signup.founding_number })
    }
    const { data: result, error } = await context.admin.rpc('reconcile_founder_entitlement', { p_user_id: signup.user_id })
    if (error) throw error
    return jsonResponse(origin, 200, { ok: true, ...result })
  } catch (error) {
    console.error('beta-admin failed', error instanceof Error ? error.name : 'unknown_error')
    return jsonResponse(origin, 503, { error: 'Admin action could not be completed.', code: 'UNAVAILABLE' })
  }
})
