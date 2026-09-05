export async function keyedHash(value: string, secret: string) {
  const encoder = new TextEncoder()
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(`${secret}|${value}`))
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function clientIp(request: Request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown-client'
}
