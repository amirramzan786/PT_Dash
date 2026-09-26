const DEFAULT_SECTION = 'overview'

/**
 * Keep the Coach console route deliberately small and non-sensitive. The hash
 * may identify a section and an opaque relationship id, but it must never
 * contain tokens, health values or private-media URLs.
 */
export function parseCoachRoute(hash, allowedSections = []) {
  const raw = String(hash || '').replace(/^#/, '').replace(/^\/+|\/+$/g, '')
  const [rawSection, encodedClientId] = raw.split('/')
  const requestedSection = String(rawSection || '').toLowerCase()
  const section = allowedSections.includes(requestedSection) ? requestedSection : DEFAULT_SECTION
  let clientId = null
  if (section === 'clients' && encodedClientId) {
    try {
      const decoded = decodeURIComponent(encodedClientId)
      if (decoded && decoded.length <= 160 && !/[?#]/.test(decoded)) clientId = decoded
    } catch { /* An invalid deep link falls back to the roster. */ }
  }
  return { section, clientId }
}

export function formatCoachRoute({ section = DEFAULT_SECTION, clientId = null } = {}) {
  const safeSection = String(section || DEFAULT_SECTION).replace(/[^a-z0-9_-]/gi, '') || DEFAULT_SECTION
  const safeClientId = clientId === null || clientId === undefined || clientId === ''
    ? ''
    : `/${encodeURIComponent(String(clientId).slice(0, 160))}`
  return `#${safeSection}${safeSection === 'clients' ? safeClientId : ''}`
}

export function coachRouteUrl(route, location = window.location) {
  return `${location.pathname}${location.search}${formatCoachRoute(route)}`
}

