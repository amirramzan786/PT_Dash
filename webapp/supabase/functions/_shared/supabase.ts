import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function keyFromEnv(jsonName: string, legacyNames: string[]) {
  const raw = Deno.env.get(jsonName)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      return parsed.default || Object.values(parsed)[0] || ''
    } catch {
      return raw
    }
  }
  for (const name of legacyNames) {
    const value = Deno.env.get(name)
    if (value) return value
  }
  return ''
}

export function supabaseUrl() {
  return Deno.env.get('SUPABASE_URL') || ''
}

export function publishableKey() {
  return keyFromEnv('SUPABASE_PUBLISHABLE_KEYS', ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'])
}

export function secretKey() {
  return keyFromEnv('SUPABASE_SECRET_KEYS', ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'])
}

export function createAdminClient(): SupabaseClient {
  const url = supabaseUrl()
  const key = secretKey()
  if (!url || !key) throw new Error('Supabase server configuration is unavailable.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function createAuthClient(accessToken?: string): SupabaseClient {
  const url = supabaseUrl()
  const key = publishableKey()
  if (!url || !key) throw new Error('Supabase public configuration is unavailable.')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}
