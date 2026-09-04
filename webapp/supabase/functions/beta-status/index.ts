import { createAdminClient } from '../_shared/supabase.ts'
import { jsonResponse, preflightResponse, requestOrigin } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const origin = requestOrigin(request)
  if (origin === null) return new Response(JSON.stringify({ error: 'This origin is not allowed.' }), { status: 403 })
  if (request.method === 'OPTIONS') return preflightResponse(origin)
  if (request.method !== 'GET') return jsonResponse(origin, 405, { error: 'Use GET for beta availability.' })
  try {
    const admin = createAdminClient()
    const { count, error } = await admin.from('beta_signups')
      .select('founding_number', { count: 'exact', head: true })
      .in('status', ['verified', 'approved'])
      .not('founding_number', 'is', null)
    if (error) throw error
    const claimed = Math.min(20, count || 0)
    return jsonResponse(origin, 200, { capacity: 20, claimed, remaining: 20 - claimed, full: claimed >= 20 })
  } catch (error) {
    console.error('beta-status failed', error instanceof Error ? error.name : 'unknown_error')
    return jsonResponse(origin, 503, { error: 'Availability is temporarily unavailable.', code: 'UNAVAILABLE' })
  }
})
