/**
 * Pure layout rules for the Coach dashboard. Keeping these rules outside the
 * React surface makes local preference recovery deterministic and testable.
 */
export const DASHBOARD_WIDGET_CATALOG = Object.freeze([
  Object.freeze({ id: 'stats', label: 'Workspace snapshot', description: 'Active clients, actions and signals.' }),
  Object.freeze({ id: 'cockpit', label: 'Coach cockpit', description: 'Consent-first view of important work.' }),
  Object.freeze({ id: 'workflow', label: 'Coach loop', description: 'Connect, understand and coach.' }),
  Object.freeze({ id: 'pilot', label: 'First pilot', description: 'Invite readiness for the first client.' }),
  Object.freeze({ id: 'ai', label: 'Signal report', description: 'Internal AI Coach testing fixtures.' }),
])

export const DEFAULT_DASHBOARD_LAYOUT = Object.freeze([
  Object.freeze({ id: 'stats', size: 'wide' }),
  Object.freeze({ id: 'cockpit', size: 'large' }),
  Object.freeze({ id: 'workflow', size: 'large' }),
  Object.freeze({ id: 'pilot', size: 'wide' }),
  Object.freeze({ id: 'ai', size: 'wide' }),
])

const widgetIds = new Set(DASHBOARD_WIDGET_CATALOG.map((widget) => widget.id))
const sizes = new Set(['wide', 'large'])

export function cloneDefaultDashboardLayout() {
  return DEFAULT_DASHBOARD_LAYOUT.map((widget) => ({ ...widget }))
}

export function normaliseDashboardLayout(value) {
  if (!Array.isArray(value)) return cloneDefaultDashboardLayout()
  // An explicitly saved empty array is a valid user choice; the UI provides
  // an Add widgets recovery card instead of silently restoring every widget.
  if (value.length === 0) return []
  const seen = new Set()
  const result = value.reduce((items, item) => {
    if (!item || !widgetIds.has(item.id) || seen.has(item.id)) return items
    seen.add(item.id)
    items.push({ id: item.id, size: sizes.has(item.size) ? item.size : 'wide' })
    return items
  }, [])
  return result.length ? result : cloneDefaultDashboardLayout()
}

export function toggleDashboardWidget(layout, id) {
  if (!widgetIds.has(id)) return normaliseDashboardLayout(layout)
  if (layout.some((widget) => widget.id === id)) return layout.filter((widget) => widget.id !== id)
  return [...layout, { id, size: 'wide' }]
}

export function moveDashboardWidget(layout, sourceId, targetId) {
  if (sourceId === targetId) return layout
  const sourceIndex = layout.findIndex((item) => item.id === sourceId)
  const targetIndex = layout.findIndex((item) => item.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0) return layout
  const next = [...layout]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

export function moveDashboardWidgetByOffset(layout, sourceId, offset) {
  if (!Number.isInteger(offset) || offset === 0) return layout
  const sourceIndex = layout.findIndex((item) => item.id === sourceId)
  if (sourceIndex < 0) return layout
  const targetIndex = Math.max(0, Math.min(layout.length - 1, sourceIndex + offset))
  if (targetIndex === sourceIndex) return layout
  return moveDashboardWidget(layout, sourceId, layout[targetIndex].id)
}

export function resizeDashboardWidget(layout, id, size) {
  if (!sizes.has(size)) return layout
  return layout.map((item) => item.id === id ? { ...item, size } : item)
}

