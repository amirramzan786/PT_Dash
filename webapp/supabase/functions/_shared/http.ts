export function allowedOrigins() {
  const configured = (Deno.env.get('MARKETING_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return new Set(configured.length ? configured : [
    'https://project-steel-sitepagesdev.u1165153.workers.dev',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
  ])
}

export function requestOrigin(request: Request) {
  const origin = request.headers.get('origin')?.trim() || ''
  if (!origin) return ''
  return allowedOrigins().has(origin) ? origin : null
}

export function corsHeaders(origin: string) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info'
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  }
  return headers
}

export function jsonResponse(origin: string, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) })
}

export function preflightResponse(origin: string) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

export function safeSource(value: unknown) {
  const source = String(value ?? 'marketing-site').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9._-]{0,79}$/.test(source) ? source : 'marketing-site'
}
