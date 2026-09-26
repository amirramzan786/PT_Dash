import { createAdminClient, createAuthClient } from '../_shared/supabase.ts'
import { jsonResponse, preflightResponse } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || ''
  const allowed = ['https://app.projectsteel.co.uk', 'https://pt-dash.pages.dev', 'http://localhost:5173', 'http://127.0.0.1:5173']
  const originAllowed = allowed.includes(origin) || /^https:\/\/[-a-z0-9]+\.pt-dash\.pages\.dev$/i.test(origin)
  if (!originAllowed) return new Response(JSON.stringify({ error: 'This origin is not allowed.' }), { status: 403 })
  if (request.method === 'OPTIONS') return preflightResponse(origin)
  if (request.method !== 'POST') return jsonResponse(origin, 405, { error: 'Use POST.' })
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!token) return jsonResponse(origin, 401, { error: 'Sign in as a Steel administrator.' })
  try {
    const auth = createAuthClient(token)
    const { data: identity, error: identityError } = await auth.auth.getUser()
    if (identityError || !identity.user) return jsonResponse(origin, 401, { error: 'Sign in as a Steel administrator.' })
    const admin = createAdminClient()
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', identity.user.id).maybeSingle()
    if (role?.role !== 'admin') return jsonResponse(origin, 403, { error: 'Steel administrator access is required.' })
    const body = await request.json() as { applicationId?: string }
    if (!body.applicationId) return jsonResponse(origin, 400, { error: 'Choose an application.' })
    const { data: application, error } = await admin.from('coach_applications').select('*').eq('id', body.applicationId).eq('state', 'approved').single()
    if (error || !application) return jsonResponse(origin, 409, { error: 'Approve the application before activation.' })
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(application.email, { redirectTo: 'https://app.projectsteel.co.uk/coach' })
    if (inviteError || !invite.user) throw inviteError || new Error('Invite could not be created.')
    const userId = invite.user.id
    const { error: roleError } = await admin.from('user_roles').upsert({ user_id: userId, role: 'trainer' }, { onConflict: 'user_id' })
    if (roleError) throw roleError
    const { error: directoryError } = await admin.from('coach_directory_profiles').upsert({ user_id: userId, application_id: application.id, display_name: application.full_name, headline: application.headline, bio: application.bio, specialties: application.specialties, coaching_style: application.coaching_style, ideal_client: application.ideal_client, availability_note: application.availability_note, state: 'approved', approved_by: identity.user.id }, { onConflict: 'user_id' })
    if (directoryError) throw directoryError
    await admin.from('coach_applications').update({ state: 'activated', reviewed_at: new Date().toISOString(), reviewed_by: identity.user.id }).eq('id', application.id)
    await admin.from('coach_application_audit').insert({ application_id: application.id, action: 'activated', actor_id: identity.user.id, note: 'Coach invite sent and approved directory profile created.' })
    return jsonResponse(origin, 200, { ok: true, message: 'Coach invite sent and profile published to the approved directory.' })
  } catch (error) {
    console.error('coach admin failed', error instanceof Error ? error.name : 'unknown')
    return jsonResponse(origin, 503, { error: 'Activation could not be completed.' })
  }
})
