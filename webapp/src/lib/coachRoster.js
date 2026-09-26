/**
 * Deterministic roster semantics for the Coach Check-in Command Centre.
 *
 * The UI can change shape (cards, list or a future mobile queue) without
 * changing how attention, due dates or consent are classified. Keep this
 * helper free of Supabase and browser state so it is safe to reuse in tests,
 * exports and a future coach mobile client.
 */

export const COACH_SAVED_VIEWS = Object.freeze([
  Object.freeze({ id: 'all', label: 'All clients' }),
  Object.freeze({ id: 'needs_attention', label: 'Needs attention' }),
  Object.freeze({ id: 'checkin_due', label: 'Check-in due' }),
  Object.freeze({ id: 'on_track', label: 'On track' }),
  Object.freeze({ id: 'no_activity', label: 'No activity' }),
])

export const COACH_ROSTER_COLUMNS = Object.freeze([
  Object.freeze({ id: 'status', label: 'Status', description: 'Relationship and attention state.' }),
  Object.freeze({ id: 'last_checkin', label: 'Last check-in', description: 'Most recent submitted check-in.' }),
  Object.freeze({ id: 'adherence', label: 'Adherence', description: 'Workouts and nutrition activity.' }),
  Object.freeze({ id: 'wellbeing', label: 'Wellbeing', description: 'Energy, sleep and soreness context.' }),
  Object.freeze({ id: 'next_action', label: 'Next action', description: 'The most useful next coaching step.' }),
])

const DAY_MS = 24 * 60 * 60 * 1000

function toTimestamp(value) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function daysSince(value, nowTimestamp) {
  const timestamp = toTimestamp(value)
  if (timestamp === null) return null
  return Math.max(0, Math.floor((nowTimestamp - timestamp) / DAY_MS))
}

function hasConsent(relationship) {
  return relationship?.state === 'active'
    && Array.isArray(relationship?.consent_domains)
    && relationship.consent_domains.includes('coach_progress')
}

function hasRiskSignal(checkin) {
  if (!checkin) return false
  return Boolean(checkin.pain_or_injury)
    || Boolean(checkin.questions)
    || Number(checkin.energy) <= 2
    || Number(checkin.soreness) >= 4
}

function nextActionFor(relationship, { checkinDue, noActivity, current }) {
  if (relationship?.state === 'accepted_pending_consent') return 'Request progress consent'
  if (relationship?.state === 'invited') return 'Await client acceptance'
  if (relationship?.state !== 'active') return 'Review relationship state'
  if (checkinDue) return 'Request check-in'
  if (noActivity) return 'Check in with client'
  if (hasRiskSignal(current)) return 'Review check-in context'
  return 'Keep momentum'
}

/**
 * Return the operational summary a Coach needs before opening a client.
 * `now` is injectable so due/no-activity rules remain deterministic in tests.
 */
export function summariseCoachClient(relationship, now = new Date()) {
  const nowTimestamp = toTimestamp(now) ?? Date.now()
  const current = relationship?.checkin_current || null
  const visible = hasConsent(relationship)
  const lastCheckinAt = current?.submitted_at || current?.week_start || null
  const lastActivityAt = lastCheckinAt || relationship?.updated_at || relationship?.created_at || null
  const daysSinceActivity = daysSince(lastActivityAt, nowTimestamp)
  const needsAttention = relationship?.state !== 'active' || (visible && hasRiskSignal(current))
  const checkinDue = relationship?.state === 'active' && !current
  const noActivity = relationship?.state === 'active' && (daysSinceActivity === null || daysSinceActivity > 14)
  const onTrack = relationship?.state === 'active' && !needsAttention && !checkinDue && !noActivity
  const workouts = visible && current ? Number(current.workouts_completed) || 0 : null
  const nutritionDays = visible && current ? Number(current.nutrition_days) || 0 : null
  const wellbeing = visible && current
    ? `${current.energy ?? '—'}/5 energy · ${current.sleep ?? '—'}/5 sleep`
    : 'Consent required'

  const nextAction = nextActionFor(relationship, { checkinDue, noActivity, current })

  return {
    state: relationship?.state || 'unknown',
    visible,
    needsAttention,
    checkinDue,
    noActivity,
    onTrack,
    lastCheckinAt,
    lastActivityAt,
    daysSinceActivity,
    workouts,
    nutritionDays,
    wellbeing,
    nextAction,
  }
}

export function filterCoachRelationships(relationships = [], { view = 'all', query = '', now } = {}) {
  const normalisedQuery = String(query || '').trim().toLowerCase()
  return relationships.filter((relationship, index) => {
    const summary = summariseCoachClient(relationship, now)
    const name = relationship?.client_display_name || relationship?.client_name || `Client ${index + 1}`
    const haystack = `${name} ${relationship?.client_email || ''}`.toLowerCase()
    if (normalisedQuery && !haystack.includes(normalisedQuery)) return false
    if (view === 'needs_attention') return summary.needsAttention
    if (view === 'checkin_due') return summary.checkinDue
    if (view === 'on_track') return summary.onTrack
    if (view === 'no_activity') return summary.noActivity
    return true
  })
}

export function countCoachRelationships(relationships = [], view, now) {
  return filterCoachRelationships(relationships, { view, now }).length
}

