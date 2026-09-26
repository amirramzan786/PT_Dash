import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, Camera, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, ClipboardCheck, GripVertical, Home, LayoutGrid, List, LogOut, MessageSquare, PersonStanding, RefreshCw, RotateCcw, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, UserRound, UsersRound } from 'lucide-react'
import SteelMark from './SteelMark'
import '../coach-history.css'
import '../coach-roster.css'
import '../coach-client-detail.css'
import { buildWeeklyCoachReport } from '../lib/aiCoachSignals.js'
import { DASHBOARD_WIDGET_CATALOG, cloneDefaultDashboardLayout, moveDashboardWidget, moveDashboardWidgetByOffset, normaliseDashboardLayout, resizeDashboardWidget, toggleDashboardWidget } from '../lib/coachDashboardLayout.js'
import { coachRouteUrl, formatCoachRoute, parseCoachRoute } from '../lib/coachNavigation.js'
import { COACH_ROSTER_COLUMNS, COACH_SAVED_VIEWS, filterCoachRelationships, summariseCoachClient } from '../lib/coachRoster.js'
import { COACH_CLIENT_DETAIL_TABS, buildCheckinTimeline, buildClientCoachInsights, checkinReviewKey, normaliseCoachNote, normaliseReviewMap } from '../lib/coachClientDetail.js'
import { activateCoachApplication, loadCoachApplications, loadCoachClientWorkflow, reviewCoachApplication, saveCoachCheckinReview, saveCoachPrivateNote } from '../lib/steelApi.js'

const coachSections = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'clients', label: 'Clients', icon: UsersRound },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const stateLabels = {
  invited: 'Invitation sent',
  accepted_pending_consent: 'Awaiting consent',
  active: 'Active',
  paused: 'Paused',
  transfer_pending: 'Transfer requested',
  revoked: 'Revoked',
  expired: 'Expired',
}

const stateDescriptions = {
  invited: 'No client progress is visible until the invitation is accepted.',
  accepted_pending_consent: 'Client accepted; explicit progress access is still required.',
  active: 'Client has granted progress access for this Coach relationship.',
  paused: 'Visibility is paused until the relationship is resumed.',
  transfer_pending: 'A relationship transfer is waiting for confirmation.',
  revoked: 'Progress access was revoked; client data remains with the client.',
  expired: 'The invitation expired before the relationship was accepted.',
}

function formatState(state) {
  return stateLabels[state] || 'Relationship update'
}

function describeState(state) {
  return stateDescriptions[state] || 'Review the relationship state before taking the next action.'
}

function RelationshipBadge({ state }) {
  return <span className={`coach-state-badge coach-state-${state || 'unknown'}`} role="status" title={describeState(state)} aria-label={`${formatState(state)}. ${describeState(state)}`}><span aria-hidden="true" />{formatState(state)}</span>
}

function EmptyCoachPanel({ icon: Icon, eyebrow, title, copy, action }) {
  return <article className="coach-empty-panel"><span className="coach-empty-icon"><Icon size={22}/></span><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{copy}</p>{action}</div></article>
}

function DashboardWidget({ widget, editing, dragging, dropTarget, onResize, onRemove, onKeyboardMove, onDragStart, onDragOver, onDrop, onDragEnd, onPointerDragStart, children }) {
  const beginResize = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const finish = () => { window.removeEventListener('pointermove', update); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish) }
    const update = (moveEvent) => {
      if (Math.abs(moveEvent.clientX - startX) < 36) return
      onResize(moveEvent.clientX > startX ? 'wide' : 'large')
      finish()
    }
    window.addEventListener('pointermove', update)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }
  const beginPointerDrag = (event) => {
    if (event.pointerType === 'mouse') return
    event.preventDefault()
    onPointerDragStart?.()
  }
  const handleKeyboardMove = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      onKeyboardMove?.(-1)
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      onKeyboardMove?.(1)
    }
  }
  const handleKeyboardResize = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onResize?.('large')
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onResize?.('wide')
    }
  }
  const widgetLabel = DASHBOARD_WIDGET_CATALOG.find((item) => item.id === widget.id)?.label || 'widget'
  return <section className={`coach-widget coach-widget-${widget.size}${dragging ? ' is-dragging' : ''}${dropTarget ? ' is-drop-target' : ''}`} data-widget-id={widget.id} draggable={editing} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
    {editing && <div className="coach-widget-toolbar"><span className="coach-widget-drag-handle" onPointerDown={beginPointerDrag} onKeyDown={handleKeyboardMove} role="button" tabIndex="0" title="Drag to move" aria-label={`Move ${widgetLabel}. Use arrow keys to reorder`} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"><GripVertical size={14}/> Drag to move {widgetLabel}</span><div><button type="button" className="coach-widget-action coach-widget-remove" onClick={onRemove} aria-label="Remove widget" title="Remove widget">×</button></div></div>}
    {children}
    {editing && <button type="button" className="coach-widget-resize-handle" onPointerDown={beginResize} onKeyDown={handleKeyboardResize} aria-label={`Resize ${widgetLabel} widget`} aria-keyshortcuts="ArrowLeft ArrowRight" title="Drag to resize or use arrow keys"><span aria-hidden="true" /></button>}
  </section>
}

function CoachInviteRehearsal() {
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState('idle')
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid client email to rehearse the invite.')
      return
    }
    setEmail(value)
    setError('')
    setStage('invited')
  }
  const reset = () => { setStage('idle'); setError('') }
  const stages = [
    ['invited', 'Invitation created', 'A one-time, expiring invite is ready. No client progress is visible.'],
    ['accepted_pending_consent', 'Client accepted', 'Acceptance creates a pending relationship only; Coach reads remain closed.'],
    ['active', 'Consent granted', 'The client selected coach_progress and the read-only Coach view can open.'],
  ]
  return <section className="coach-card coach-invite-rehearsal" aria-labelledby="coach-invite-rehearsal-title">
    <div className="coach-card-heading"><div><span className="eyebrow">LOCAL PILOT REHEARSAL</span><h3 id="coach-invite-rehearsal-title">Rehearse the secure invite loop.</h3></div><ShieldCheck size={19}/></div>
    <p>Validate the three-step relationship boundary before we wire an approved email sender. This rehearsal is development-only: it never calls Supabase, sends email or creates a real relationship.</p>
    {stage === 'idle' ? <form className="coach-invite-form" onSubmit={submit} noValidate><label><span>Test client email</span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="client@example.com" autoComplete="off" aria-describedby={error ? 'coach-invite-error' : undefined}/></label><button type="submit" className="coach-layout-button"><UsersRound size={15}/> Create rehearsal invite</button>{error && <small className="coach-invite-error" id="coach-invite-error" role="alert">{error}</small>}</form> : <div className="coach-invite-timeline"><div className="coach-invite-target"><span className="coach-state-badge coach-state-invited"><span aria-hidden="true"/>Test invite</span><strong>{email}</strong><small>No token is shown or stored.</small></div>{stages.map(([id, title, copy], index) => <article className={`coach-invite-step ${stage === id ? 'current' : ''} ${stages.findIndex(([step]) => step === stage) > index ? 'complete' : ''}`} key={id}><span>{stages.findIndex(([step]) => step === stage) > index ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><small>{copy}</small></div></article>)}<div className="coach-invite-actions">{stage === 'invited' && <button type="button" className="coach-layout-button" onClick={() => setStage('accepted_pending_consent')}>Simulate client acceptance <ChevronRight size={15}/></button>}{stage === 'accepted_pending_consent' && <button type="button" className="coach-layout-button" onClick={() => setStage('active')}>Simulate explicit consent <ChevronRight size={15}/></button>}{stage === 'active' && <span className="coach-invite-success" role="status"><CheckCircle2 size={16}/> Consent boundary passed locally.</span>}<button type="button" className="coach-layout-button coach-layout-reset" onClick={reset}>Reset rehearsal</button></div></div>}
  </section>
}

function CoachDashboard({ relationships, activeCount, pendingCount, aiCoachAggregate, accountEmail, isAdmin }) {
  const storageKey = `steel:coach-dashboard-layout:${accountEmail || 'default'}`
  const [editing, setEditing] = useState(false)
  const [layout, setLayout] = useState(() => cloneDefaultDashboardLayout())
  const [draggingId, setDraggingId] = useState('')
  const [dropTargetId, setDropTargetId] = useState('')
  const [layoutNotice, setLayoutNotice] = useState('')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (!saved) { setLayout(cloneDefaultDashboardLayout()); return }
      const parsed = JSON.parse(saved)
      setLayout(normaliseDashboardLayout(parsed))
    } catch { setLayout(cloneDefaultDashboardLayout()) }
  }, [storageKey])

  useEffect(() => {
    if (!editing) return undefined
    const closeEditor = (event) => {
      if (event.key !== 'Escape') return
      setEditing(false)
      setDraggingId('')
      setDropTargetId('')
    }
    window.addEventListener('keydown', closeEditor)
    return () => window.removeEventListener('keydown', closeEditor)
  }, [editing])

  const saveLayout = (next) => {
    setLayout(next)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      setLayoutNotice('Saved on this device.')
    } catch {
      setLayoutNotice('Updated for this session.')
    }
  }
  const resetLayout = () => saveLayout(cloneDefaultDashboardLayout())
  const toggleWidget = (id) => {
    saveLayout(toggleDashboardWidget(layout, id))
  }
  const moveWidget = (sourceId, targetId) => {
    saveLayout(moveDashboardWidget(layout, sourceId, targetId))
  }
  const moveWidgetByOffset = (sourceId, offset) => {
    saveLayout(moveDashboardWidgetByOffset(layout, sourceId, offset))
  }
  const resizeWidget = (id, size) => saveLayout(resizeDashboardWidget(layout, id, size))
  const startPointerDrag = (sourceId) => {
    setDraggingId(sourceId)
    const update = (moveEvent) => {
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('[data-widget-id]')
      setDropTargetId(target?.getAttribute('data-widget-id') || '')
    }
    const finish = (upEvent) => {
      const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('[data-widget-id]')
      if (target) moveWidget(sourceId, target.getAttribute('data-widget-id'))
      window.removeEventListener('pointermove', update)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      setDraggingId('')
      setDropTargetId('')
    }
    window.addEventListener('pointermove', update)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }
  const renderWidget = (widget) => {
    if (widget.id === 'stats') return <section className="coach-stat-grid" aria-label="Coach workspace summary"><article><UsersRound size={18}/><span>ACTIVE CLIENTS</span><strong>{activeCount}</strong><small>Consent-led relationships</small></article><article><CircleAlert size={18}/><span>AWAITING ACTION</span><strong>{pendingCount}</strong><small>Invites or consent steps</small></article><article><Sparkles size={18}/><span>COACH SIGNALS</span><strong>0</strong><small>Insight engine is next</small></article></section>
    if (widget.id === 'cockpit') return <article className="coach-card coach-cockpit-card"><div className="coach-card-heading"><div><span className="eyebrow">COACH COCKPIT</span><h3>A calm view of the work that matters.</h3></div><ShieldCheck size={19}/></div><p>When a client has explicitly shared Coach progress, this space will surface adherence, momentum and follow-up prompts without changing their plan silently.</p><div className="coach-guardrail"><CheckCircle2 size={16}/><span>Client consent is required before progress appears here.</span></div></article>
    if (widget.id === 'workflow') return <article className="coach-card coach-workflow-card"><div className="coach-card-heading"><div><span className="eyebrow">WORKFLOW PREVIEW</span><h3>The Coach loop</h3></div><ChevronRight size={18}/></div><div className="coach-workflow-list"><div><span>01</span><p><strong>Connect</strong><small>Invite a client and wait for acceptance.</small></p></div><div><span>02</span><p><strong>Understand</strong><small>Review consented progress signals.</small></p></div><div><span>03</span><p><strong>Coach</strong><small>Ask, agree and adjust together.</small></p></div></div></article>
    if (widget.id === 'pilot') return !relationships.length ? <EmptyCoachPanel icon={UsersRound} eyebrow="FIRST PILOT" title="Your first client will appear here." copy="The invite flow is deliberately held for the Coach pilot. Once a relationship is accepted and consented, clients will land in this workspace." action={<button type="button" className="coach-disabled-action" disabled>Invite client · pilot setup next</button>}/> : <EmptyCoachPanel icon={UsersRound} eyebrow="FIRST PILOT" title={`${relationships.length} client relationship${relationships.length === 1 ? '' : 's'} connected.`} copy="Review consent and keep the next useful action visible." />
    return <AiCoachTestingPanel aggregate={aiCoachAggregate}/>
  }
  const pilotRehearsal = import.meta.env.DEV && new URLSearchParams(window.location.search).get('coach-fixture') === 'relationships'
  return <>
    <section className="coach-widget-controls" aria-label="Dashboard layout controls"><div><span className="eyebrow">DASHBOARD LAYOUT</span><h3>Make it yours</h3><p>Choose the widgets you want, then arrange or resize them. Your layout is saved on this device.</p></div><div className="coach-widget-control-actions"><button type="button" className="coach-layout-button" onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit dashboard'}</button><button type="button" className="coach-layout-button coach-layout-reset" onClick={resetLayout}><RotateCcw size={14}/> Reset layout</button>{layoutNotice && <span className="coach-layout-status" role="status" aria-live="polite">{layoutNotice}</span>}</div>{editing && <div className="coach-widget-toggle-row">{DASHBOARD_WIDGET_CATALOG.map((item) => { const enabled = layout.some((widget) => widget.id === item.id); return <button type="button" key={item.id} className={`coach-widget-toggle ${enabled ? 'active' : ''}`} aria-pressed={enabled} onClick={() => toggleWidget(item.id)}><span>{enabled ? '✓' : '+'}</span><strong>{item.label}</strong><small>{item.description}</small></button> })}</div>}</section>
    <section className="coach-dashboard-pulse" aria-label="Today's coaching pulse"><div className="coach-dashboard-pulse-copy"><span className="eyebrow">TODAY’S COACHING PULSE</span><h3>Keep the next useful action visible.</h3><p>Start with the clients who need a response, then use the consented history to coach with context.</p></div><div className="coach-dashboard-pulse-metrics"><div><strong>{pendingCount}</strong><span>Needs attention</span></div><div><strong>{activeCount}</strong><span>Active clients</span></div><div><strong>{relationships.length}</strong><span>In workspace</span></div></div></section>
    {isAdmin && <ReviewQueue/>}
    {pilotRehearsal && <CoachInviteRehearsal/>}
    <div className="coach-widget-grid">{layout.length ? layout.map((widget) => <DashboardWidget key={widget.id} widget={widget} editing={editing} dragging={draggingId === widget.id} dropTarget={dropTargetId === widget.id && draggingId !== widget.id} onPointerDragStart={() => startPointerDrag(widget.id)} onKeyboardMove={(offset) => moveWidgetByOffset(widget.id, offset)} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', widget.id); setDraggingId(widget.id); event.currentTarget.classList.add('is-dragging') }} onDragOver={(event) => { event.preventDefault(); setDropTargetId(widget.id) }} onDrop={(event) => { event.preventDefault(); moveWidget(event.dataTransfer.getData('text/plain'), widget.id); setDraggingId(''); setDropTargetId(''); event.currentTarget.classList.remove('is-dragging') }} onDragEnd={(event) => { setDraggingId(''); setDropTargetId(''); event.currentTarget.classList.remove('is-dragging') }} onResize={(size) => resizeWidget(widget.id, size)} onRemove={() => toggleWidget(widget.id)}>{renderWidget(widget)}</DashboardWidget>) : <section className="coach-card coach-widget-empty"><span className="coach-empty-icon"><GripVertical size={21}/></span><div><span className="eyebrow">EMPTY DASHBOARD</span><h3>Add the widgets you need.</h3><p>Your dashboard is clear. Turn editing on to choose a workspace snapshot, cockpit, workflow, pilot or signal report.</p><button type="button" className="coach-layout-button" onClick={() => setEditing(true)}>Add widgets</button></div></section>}</div>
  </>
}

function CoachAvatar({ relationship }) {
  const avatarUrl = relationship?.trainer_avatar_url || relationship?.coach_avatar_url || null
  if (avatarUrl) return <img className="coach-profile-avatar" src={avatarUrl} alt="" />
  return <div className="coach-profile-avatar coach-profile-avatar-fallback" aria-hidden="true"><SteelMark size={38} title="Steel Coach" /></div>
}

function AiCoachTestingPanel({ aggregate }) {
  const [fixture, setFixture] = useState('live')
  const fixtures = {
    live: aggregate || {},
    effort: { training: { logged_sessions_recent: 3, logged_sessions_baseline: 5, average_rpe_recent: 8, average_rpe_baseline: 6.2 }, latest_checkin: { energy: 2, soreness: 4 } },
    training: { training: { logged_sessions_recent: 1, logged_sessions_baseline: 4 }, nutrition: { logged_days_recent: 5, logged_days_baseline: 5 } },
    nutrition: { training: { logged_sessions_recent: 4, logged_sessions_baseline: 4 }, nutrition: { logged_days_recent: 1, logged_days_baseline: 5 } },
    empty: {},
  }
  const report = useMemo(() => buildWeeklyCoachReport(fixtures[fixture]), [aggregate, fixture])
  return <section className="coach-card ai-coach-testing-panel"><div className="coach-card-heading"><div><span className="eyebrow">INTERNAL AI COACH TESTING</span><h3>Weekly signal report</h3></div><Sparkles size={19}/></div><p>Signals, not silent decisions. This protected preview reads aggregate signals only. It never changes a member plan or sends a member message.</p><div className="ai-coach-fixtures" role="group" aria-label="AI Coach report fixtures">{[['live','Live aggregate'],['effort','High effort'],['training','Training dip'],['nutrition','Nutrition dip'],['empty','No data']].map(([id,label]) => <button type="button" key={id} className={fixture === id ? 'active' : ''} onClick={() => setFixture(id)}>{label}</button>)}</div><div className="coach-guardrail"><ShieldCheck size={16}/><span>{report.status === 'actionable' ? `${report.signals.length} signal${report.signals.length === 1 ? '' : 's'} ready for review.` : 'No actionable signal with the available data.'}</span></div>{report.primary && <article className="ai-coach-primary-signal"><span className="eyebrow">PRIMARY SIGNAL</span><strong>{report.primary.title}</strong><small>{report.primary.observation}</small><span>{report.primary.question}</span></article>}<small>Schema {report.schemaVersion} · {report.guardrails.join(' · ')}</small></section>
}

function clientName(relationship, index) {
  return relationship?.client_display_name || relationship?.client_name || `Client ${index + 1}`
}

function canViewClientData(relationship) {
  return relationship?.state === 'active' && Array.isArray(relationship?.consent_domains) && relationship.consent_domains.includes('coach_progress')
}

const checkinMetricFields = [
  ['energy', 'Energy', '/5'],
  ['sleep', 'Sleep quality', '/5'],
  ['stress', 'Stress', '/5'],
  ['soreness', 'Soreness', '/5'],
  ['workouts_completed', 'Workouts', ''],
  ['nutrition_days', 'Nutrition days', ''],
  ['weight_lb', 'Weight', ' lb'],
  ['waist_cm', 'Waist', ' cm'],
  ['chest_bust_cm', 'Chest / bust', ' cm'],
  ['hips_cm', 'Hips', ' cm'],
  ['arm_cm', 'Arm', ' cm'],
  ['thigh_cm', 'Thigh', ' cm'],
]

const checkinNarrativeFields = [
  ['pain_or_injury', 'PAIN, SORENESS OR INJURY'],
  ['wins', 'WINS'],
  ['challenges', 'CHALLENGES'],
  ['questions', 'QUESTIONS FOR COACH'],
]

function formatCheckinDate(value, fallback = 'Date not recorded') {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CoachCheckinFields({ checkin, compact = false }) {
  if (!checkin) return null
  const fields = compact ? checkinMetricFields.slice(0, 8) : checkinMetricFields
  return <div className={`coach-checkin-field-grid${compact ? ' is-compact' : ''}`}>{fields.map(([key, label, suffix]) => <div key={key}><span>{label}</span><strong>{checkin[key] === null || checkin[key] === undefined || checkin[key] === '' ? 'Not submitted' : `${checkin[key]}${suffix}`}</strong></div>)}</div>
}

function CoachCheckinNarrative({ checkin }) {
  if (!checkin) return null
  return <div className="coach-checkin-narrative">{checkinNarrativeFields.map(([key, label]) => <div key={key}><span className="eyebrow">{label}</span><p>{checkin[key] || 'Not submitted'}</p></div>)}</div>
}

function CoachCheckinMedia({ items = [] }) {
  if (!items.length) return <p className="coach-checkin-media-empty">No progress media submitted for this check-in.</p>
  return <div className="coach-checkin-media-grid" aria-label="Check-in attachments">{items.map((item) => {
    const isVideo = item.mime_type?.startsWith('video/') || item.media_type === 'exercise_video'
    const label = item.media_type === 'exercise_video' ? 'Form video' : `${item.media_type || 'Progress'} photo`
    return <article className="coach-checkin-media-item" key={item.id || `${item.week_start}-${item.file_name}`}>
      {item.signed_url && isVideo && <video controls preload="metadata" src={item.signed_url} aria-label={`${label}: ${item.file_name}`} />}
      {item.signed_url && !isVideo && <a href={item.signed_url} target="_blank" rel="noreferrer"><img src={item.signed_url} alt={`${label}: ${item.file_name}`} /></a>}
      {!item.signed_url && <div className="coach-checkin-media-placeholder"><Camera size={20}/><strong>{label}</strong><span>Secure preview unavailable in this session.</span></div>}
      <div><strong>{item.file_name || label}</strong><small>{label} · {item.mime_type || 'Attachment'}</small></div>
    </article>
  })}</div>
}

// CHECK-IN HISTORY is exposed as a dedicated tab in the progressive client record.
function ClientCheckinDetail({ relationship, name, accountEmail, onBack }) {
  const canView = canViewClientData(relationship)
  const current = canView ? relationship.checkin_current : null
  const history = canView && Array.isArray(relationship.checkin_history) ? relationship.checkin_history : []
  const media = canView && Array.isArray(relationship.checkin_media) ? relationship.checkin_media : []
  const timeline = useMemo(() => buildCheckinTimeline(current, history), [current, history])
  const reviewStorageKey = `steel:coach-checkin-reviewed:${accountEmail || 'default'}`
  const noteStorageKey = `steel:coach-private-note:${accountEmail || 'default'}`
  const insightStorageKey = `steel:coach-insights-enabled:${accountEmail || 'default'}`
  const [tab, setTab] = useState('overview')
  const [selectedWeek, setSelectedWeek] = useState(current?.week_start || timeline[0]?.week_start || '')
  const [reviewed, setReviewed] = useState({})
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [workflowSource, setWorkflowSource] = useState('local')
  const [insightsEnabled, setInsightsEnabled] = useState(false)

  useEffect(() => {
    setTab('overview')
    setSelectedWeek(current?.week_start || timeline[0]?.week_start || '')
    setNoteSaved(false)
    try {
      const storedReviews = JSON.parse(window.localStorage.getItem(reviewStorageKey) || 'null')
      const storedNotes = JSON.parse(window.localStorage.getItem(noteStorageKey) || 'null')
      const storedInsights = window.localStorage.getItem(insightStorageKey)
      setReviewed(normaliseReviewMap(storedReviews))
      setNote(typeof storedNotes?.[relationship?.id] === 'string' ? storedNotes[relationship.id] : '')
      setInsightsEnabled(storedInsights === 'true')
    } catch { setReviewed({}); setNote('') }
  }, [current?.week_start, insightStorageKey, noteStorageKey, relationship?.id, reviewStorageKey, timeline])

  useEffect(() => {
    let cancelled = false
    if (!canView || !relationship?.id) return () => { cancelled = true }
    loadCoachClientWorkflow(relationship.id).then((workflow) => {
      if (cancelled || !workflow) return
      const remoteReviews = workflow.reviewed_keys || workflow.reviewed || workflow.reviews
      const remoteNote = workflow.private_note?.body ?? workflow.note?.body ?? workflow.private_note ?? workflow.note
      setReviewed(normaliseReviewMap(remoteReviews))
      setNote(normaliseCoachNote(remoteNote))
      setWorkflowSource('hosted')
    }).catch(() => { /* local pilot state remains authoritative until hosted RPCs exist */ })
    return () => { cancelled = true }
  }, [canView, relationship?.id])

  useEffect(() => {
    if (selectedWeek && timeline.some((entry) => entry.week_start === selectedWeek)) return
    setSelectedWeek(timeline[0]?.week_start || '')
  }, [selectedWeek, timeline])

  const selected = timeline.find((entry) => entry.week_start === selectedWeek) || timeline[0] || null
  const insightReport = useMemo(() => buildClientCoachInsights(timeline), [timeline])
  const mediaForWeek = (weekStart) => media.filter((item) => item.week_start === weekStart)
  const markReviewed = async () => {
    if (!selected) return
    const key = checkinReviewKey(relationship.id, selected.week_start)
    const nextReviewed = !reviewed[key]
    setReviewed((currentReviews) => ({ ...currentReviews, [key]: nextReviewed }))
    try {
      const result = await saveCoachCheckinReview({ relationshipId: relationship.id, weekStart: selected.week_start, reviewed: nextReviewed })
      if (result) {
        setWorkflowSource('hosted')
        return
      }
    } catch { /* Fall back to the device pilot below. */ }
    setWorkflowSource('local')
    setReviewed((currentReviews) => {
      const next = { ...currentReviews, [key]: nextReviewed }
      try { window.localStorage.setItem(reviewStorageKey, JSON.stringify(next)) } catch { /* device storage is optional */ }
      return next
    })
  }
  const saveNote = async () => {
    const nextNote = normaliseCoachNote(note)
    setNote(nextNote)
    try {
      const result = await saveCoachPrivateNote({ relationshipId: relationship.id, body: nextNote })
      if (result) {
        setWorkflowSource('hosted')
        setNoteSaved(true)
        return
      }
    } catch { /* Fall back to the device pilot below. */ }
    setWorkflowSource('local')
    try {
      const stored = JSON.parse(window.localStorage.getItem(noteStorageKey) || '{}')
      window.localStorage.setItem(noteStorageKey, JSON.stringify({ ...stored, [relationship.id]: nextNote }))
      setNoteSaved(true)
    } catch { setNoteSaved(false) }
  }
  const riskSignals = selected ? [
    selected.pain_or_injury ? `Context noted: ${selected.pain_or_injury}` : '',
    Number(selected.energy) <= 2 ? 'Energy is low; review the client’s context before changing anything.' : '',
    Number(selected.soreness) >= 4 ? 'Soreness is elevated; discuss recovery and form with the client.' : '',
    selected.questions ? 'The client has left a question for Coach follow-up.' : '',
  ].filter(Boolean) : []
  const progressMetrics = [['weight_lb', 'Weight', ' lb'], ['waist_cm', 'Waist', ' cm'], ['chest_bust_cm', 'Chest / bust', ' cm'], ['hips_cm', 'Hips', ' cm']]

  const workflowLabel = workflowSource === 'hosted' ? 'Hosted record' : 'Pilot device record'
  const notePolicyCopy = workflowSource === 'hosted'
    ? 'These notes are visible only to the Coach workspace and are saved to an auditable, coach-scoped record.'
    : 'These notes are visible only to the Coach workspace. The pilot stores them on this device until the production notes service is available.'
  const noteSavedCopy = workflowSource === 'hosted' ? 'Saved to hosted record.' : 'Saved on this device.'
  const toggleInsights = () => {
    const next = !insightsEnabled
    setInsightsEnabled(next)
    try { window.localStorage.setItem(insightStorageKey, String(next)) } catch { /* preference storage is optional */ }
  }
  return <section className="coach-client-detail" aria-labelledby="coach-client-detail-title"><button type="button" className="coach-back-button" onClick={onBack}><ChevronLeft size={16}/> Back to clients</button><article className="coach-card coach-client-detail-header"><div className="coach-client-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</div><div><span className="eyebrow">CLIENT PROFILE</span><h3 id="coach-client-detail-title">{name}</h3><small>{relationship?.client_email || 'Client email hidden until the invitation is accepted.'} · {workflowLabel}</small></div><RelationshipBadge state={relationship?.state}/></article>{canView ? <><div className="coach-client-detail-tabs" role="tablist" aria-label={`${name} record sections`}>{COACH_CLIENT_DETAIL_TABS.map(({ id, label }) => <button type="button" key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>{tab === 'overview' && <section className="coach-card coach-checkin-card coach-client-detail-panel"><div className="coach-card-heading"><div><span className="eyebrow">CLIENT OVERVIEW</span><h3>Current coaching context</h3></div><Activity size={19}/></div>{current ? <><p className="coach-checkin-date">Latest submission {formatCheckinDate(current.submitted_at)}</p><div className="coach-client-detail-summary"><div><span>Workouts</span><strong>{current.workouts_completed ?? '—'}</strong><small>completed this week</small></div><div><span>Nutrition</span><strong>{current.nutrition_days ?? '—'}/7</strong><small>days on track</small></div><div><span>Energy</span><strong>{current.energy ?? '—'}/5</strong><small>self-reported</small></div><div><span>History</span><strong>{timeline.length}</strong><small>submitted check-ins</small></div></div>{riskSignals.length > 0 && <div className="coach-client-risk-list" aria-label="Review prompts">{riskSignals.map((signal) => <div className="coach-client-risk" key={signal}><CircleAlert size={15}/><span>{signal}</span></div>)}</div>}<CoachCheckinFields checkin={current} compact/><CoachCheckinNarrative checkin={current}/></> : <div className="coach-detail-empty"><ClipboardCheck size={20}/><strong>No check-in has been submitted yet.</strong><span>Use the Check-ins tab when the client shares their first update.</span></div>}</section>}{tab === 'checkins' && <section className="coach-card coach-checkin-card coach-client-detail-panel"><div className="coach-card-heading"><div><span className="eyebrow">CHECK-IN REVIEW</span><h3>Review submitted weeks</h3></div><ClipboardCheck size={19}/></div>{timeline.length ? <><div className="coach-checkin-picker" role="listbox" aria-label="Submitted check-ins">{timeline.map((entry) => { const key = checkinReviewKey(relationship.id, entry.week_start); return <button type="button" key={key} className={selected?.week_start === entry.week_start ? 'active' : ''} aria-selected={selected?.week_start === entry.week_start} onClick={() => setSelectedWeek(entry.week_start)}><strong>{formatCheckinDate(entry.week_start)}</strong><small>{reviewed[key] ? 'Reviewed' : 'Needs review'} · {entry.workouts_completed ?? 0} workouts</small></button> })}</div>{selected && <><div className="coach-checkin-review-row"><span>{reviewed[checkinReviewKey(relationship.id, selected.week_start)] ? <><CheckCircle2 size={15}/> Reviewed</> : 'Ready for review'}</span><button type="button" className="coach-checkin-review-button" onClick={markReviewed}>{reviewed[checkinReviewKey(relationship.id, selected.week_start)] ? 'Mark as needs review' : 'Mark reviewed'}</button></div><p className="coach-checkin-date">Submitted {formatCheckinDate(selected.submitted_at)}</p><CoachCheckinFields checkin={selected}/><CoachCheckinNarrative checkin={selected}/><div className="coach-checkin-attachments"><div className="coach-card-heading"><div><span className="eyebrow">ATTACHMENTS</span><h3>Progress media</h3></div><Camera size={18}/></div><CoachCheckinMedia items={mediaForWeek(selected.week_start)}/></div></>}</> : <div className="coach-detail-empty"><ClipboardCheck size={20}/><strong>No check-ins yet.</strong><span>Submitted records will appear here.</span></div>}</section>}{tab === 'progress' && <section className="coach-card coach-checkin-card coach-client-detail-panel"><div className="coach-card-heading"><div><span className="eyebrow">PROGRESS</span><h3>Measurements over time</h3></div><Activity size={19}/></div>{timeline.length > 0 ? <div className="coach-progress-table" role="table" aria-label="Client measurement history"><div className="coach-progress-row" role="row"><span>Week</span>{progressMetrics.slice(0, 3).map(([, label]) => <span key={label}>{label}</span>)}</div>{timeline.map((entry) => <div className="coach-progress-row" role="row" key={entry.id || entry.week_start}><strong>{formatCheckinDate(entry.week_start)}</strong>{progressMetrics.slice(0, 3).map(([key, , suffix]) => <span key={key}>{entry[key] === null || entry[key] === undefined || entry[key] === '' ? '—' : `${entry[key]}${suffix}`}</span>)}</div>)}</div> : <div className="coach-detail-empty"><Activity size={20}/><strong>No progress history yet.</strong><span>Measurements will appear after a consented check-in.</span></div>}<p className="coach-checkin-date">Progress values are client-submitted context, not diagnoses or automatic plan changes.</p></section>}{tab === 'insights' && <section className={`coach-card coach-checkin-card coach-client-detail-panel coach-client-insights${insightsEnabled && insightReport.signals.length ? ' has-signals' : ''}`}><div className="coach-card-heading"><div><span className="eyebrow">STEEL AI COACH</span><h3>Insight prompts</h3></div><Sparkles size={19}/></div><p>Optional, read-only prompts from the client’s consented check-in history. They help you spot changes to discuss; they never diagnose or change a plan.</p><div className="coach-insights-toggle"><div><strong>Enable insights for this client</strong><small>Uses the two newest submitted check-ins and stays neutral when evidence is limited.</small></div><button type="button" role="switch" aria-checked={insightsEnabled} className={insightsEnabled ? 'active' : ''} onClick={toggleInsights}>{insightsEnabled ? 'Enabled' : 'Enable'}</button></div>{insightsEnabled ? insightReport.status === 'insufficient_data' ? <div className="coach-detail-empty"><Sparkles size={20}/><strong>More history will make this useful.</strong><span>Steel needs at least two submitted check-ins before it surfaces a change prompt.</span></div> : insightReport.signals.length ? <div className="coach-insight-signal-list" aria-label="Coach insight prompts">{insightReport.signals.map((signal) => <article className="coach-insight-signal" key={signal.id}><div className="coach-insight-signal-heading"><div><span className="eyebrow">TREND PROMPT</span><h4>{signal.title}</h4><p>{signal.summary}</p></div><details><summary aria-label={`About ${signal.title}`}>i</summary><p>{signal.detail}</p><small>{signal.confidence}</small></details></div></article>)}</div> : <div className="coach-detail-empty"><Sparkles size={20}/><strong>No change prompt right now.</strong><span>The available check-ins do not show a clear change worth surfacing.</span></div> : <div className="coach-insights-disabled"><Sparkles size={18}/><span>Insights are off for this client. Turn them on when you want a second set of eyes.</span></div>}<small className="coach-insights-guardrail">Read-only · consented check-ins only · no automatic plan changes</small></section>}{tab === 'notes' && <section className="coach-card coach-checkin-card coach-client-detail-panel"><div className="coach-card-heading"><div><span className="eyebrow">PRIVATE COACH NOTES</span><h3>Keep context for the next conversation</h3></div><ShieldCheck size={19}/></div><p>{notePolicyCopy}</p><div className="coach-private-note"><label htmlFor="coach-private-note-input">Private note<textarea id="coach-private-note-input" value={note} maxLength={2400} onChange={(event) => { setNote(event.target.value); setNoteSaved(false) }} placeholder="Add a coaching observation or follow-up prompt…" /></label><div className="coach-private-note-footer"><small className={noteSaved ? 'coach-private-note-saved' : ''}>{noteSaved ? noteSavedCopy : `${note.length}/2400 characters`}</small><button type="button" className="coach-note-save" onClick={saveNote}>Save private note</button></div></div></section>}</> : <section className="coach-card coach-data-locked"><ShieldCheck size={20}/><div><span className="eyebrow">DATA LOCKED</span><h3>Client data stays private.</h3><p>{relationship?.state === 'accepted_pending_consent' ? 'The client accepted the invitation, but must explicitly grant Coach progress access before check-ins appear.' : 'This relationship is not active, so check-ins and history are unavailable.'}</p></div></section>}</section>
}

function CoachClientsPanel({ relationships, accountEmail, selectedId = '', onOpenClient, onBack }) {
  const viewStorageKey = `steel:coach-client-view:${accountEmail || 'default'}`
  const savedViewStorageKey = `steel:coach-client-saved-view:${accountEmail || 'default'}`
  const columnsStorageKey = `steel:coach-client-columns:${accountEmail || 'default'}`
  const [view, setView] = useState('cards')
  const [savedView, setSavedView] = useState('all')
  const [query, setQuery] = useState('')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [columns, setColumns] = useState(() => Object.fromEntries(COACH_ROSTER_COLUMNS.map(({ id }) => [id, true])))

  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem(viewStorageKey)
      if (savedView === 'list' || savedView === 'cards') setView(savedView)
      const savedFilter = window.localStorage.getItem(savedViewStorageKey)
      if (COACH_SAVED_VIEWS.some(({ id }) => id === savedFilter)) setSavedView(savedFilter)
      const savedColumns = JSON.parse(window.localStorage.getItem(columnsStorageKey) || 'null')
      if (savedColumns && typeof savedColumns === 'object') setColumns((current) => Object.fromEntries(COACH_ROSTER_COLUMNS.map(({ id }) => [id, savedColumns[id] !== false])))
    } catch { /* device storage is optional */ }
  }, [columnsStorageKey, savedViewStorageKey, viewStorageKey])

  const setClientView = (next) => {
    setView(next)
    try { window.localStorage.setItem(viewStorageKey, next) } catch { /* device storage is optional */ }
  }
  const setClientSavedView = (next) => {
    setSavedView(next)
    try { window.localStorage.setItem(savedViewStorageKey, next) } catch { /* device storage is optional */ }
  }
  const toggleColumn = (id) => {
    setColumns((current) => {
      const next = { ...current, [id]: !current[id] }
      try { window.localStorage.setItem(columnsStorageKey, JSON.stringify(next)) } catch { /* device storage is optional */ }
      return next
    })
  }

  const selected = relationships.find((relationship) => relationship.id === selectedId)
  if (selected) return <ClientCheckinDetail relationship={selected} name={clientName(selected, relationships.indexOf(selected))} accountEmail={accountEmail} onBack={onBack} />

  const filteredRelationships = filterCoachRelationships(relationships, { view: savedView, query })
  const viewCounts = Object.fromEntries(COACH_SAVED_VIEWS.map(({ id }) => [id, filterCoachRelationships(relationships, { view: id }).length]))
  return <section className="coach-card coach-relationships-card coach-command-centre" aria-labelledby="coach-command-centre-title">
    <div className="coach-command-centre-heading"><div><span className="eyebrow">CHECK-IN COMMAND CENTRE</span><h3 id="coach-command-centre-title">Clients</h3><p className="coach-roster-subtitle">Start with the next useful action, then open the full history when context matters.</p></div><div className="coach-command-centre-count"><strong>{viewCounts.all}</strong><span>relationships</span></div></div>
    <div className="coach-roster-pulse" aria-label="Client attention summary"><div><span>NEEDS ATTENTION</span><strong>{viewCounts.needs_attention}</strong></div><div><span>CHECK-IN DUE</span><strong>{viewCounts.checkin_due}</strong></div><div><span>ON TRACK</span><strong>{viewCounts.on_track}</strong></div><div><span>NO ACTIVITY</span><strong>{viewCounts.no_activity}</strong></div></div>
    <div className="coach-roster-toolbar"><label className="coach-roster-search"><Search size={16}/><span className="sr-only">Search clients</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients or email" type="search" /></label><div className="coach-roster-toolbar-actions"><button type="button" className={`coach-columns-button${columnsOpen ? ' active' : ''}`} aria-expanded={columnsOpen} onClick={() => setColumnsOpen((open) => !open)}><SlidersHorizontal size={15}/> Columns</button><div className="coach-view-switch" role="group" aria-label="Client view"><button type="button" className={view === 'cards' ? 'active' : ''} aria-pressed={view === 'cards'} onClick={() => setClientView('cards')}><LayoutGrid size={15}/> Cards</button><button type="button" className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setClientView('list')}><List size={15}/> List</button></div></div></div>
    {columnsOpen && <div className="coach-column-picker" role="group" aria-label="Roster columns"><span className="eyebrow">SHOW IN ROSTER</span>{COACH_ROSTER_COLUMNS.map(({ id, label, description }) => <button type="button" key={id} className={columns[id] ? 'active' : ''} aria-pressed={columns[id]} onClick={() => toggleColumn(id)}><span aria-hidden="true">{columns[id] ? '✓' : '+'}</span><strong>{label}</strong><small>{description}</small></button>)}</div>}
    <div className="coach-saved-views" role="tablist" aria-label="Saved client views">{COACH_SAVED_VIEWS.map(({ id, label }) => <button type="button" key={id} role="tab" aria-selected={savedView === id} className={savedView === id ? 'active' : ''} onClick={() => setClientSavedView(id)}>{label}<span>{viewCounts[id]}</span></button>)}</div>
    {filteredRelationships.length ? <div className={`coach-client-roster coach-client-roster-${view}`}>{filteredRelationships.map((relationship, index) => { const name = clientName(relationship, index); const summary = summariseCoachClient(relationship); const current = summary.visible ? relationship.checkin_current : null; const rosterStatus = summary.needsAttention ? 'Needs attention' : summary.checkinDue ? 'Check-in due' : summary.noActivity ? 'No activity' : 'On track'; return <article className="coach-client-roster-item" key={relationship.id}><div className="coach-client-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</div><div className="coach-client-roster-copy"><strong>{name}</strong><small>{relationship.client_email || 'Invite email protected'}</small><div className="coach-client-roster-meta">{columns.status && <span className={`coach-client-next-action${summary.needsAttention ? ' needs-attention' : ''}`}><b>Status</b> {rosterStatus}</span>}{columns.last_checkin && <span><b>Last check-in</b> {formatCheckinDate(summary.lastCheckinAt, 'Not submitted')}</span>}{columns.adherence && <span><b>Adherence</b> {summary.visible && current ? `${summary.workouts} workouts · ${summary.nutritionDays}/7 nutrition` : 'Consent required'}</span>}{columns.wellbeing && <span><b>Wellbeing</b> {summary.wellbeing}</span>}{columns.next_action && <span className="coach-client-roster-followup"><b>Next</b> {summary.nextAction}</span>}</div></div><RelationshipBadge state={relationship.state}/><button type="button" className="coach-client-open" onClick={() => onOpenClient?.(relationship.id)} aria-label={`Open ${name}`}>Review <ChevronRight size={15}/></button></article>})}</div> : <section className="coach-roster-empty"><Search size={20}/><strong>{query ? 'No clients match this search.' : 'No clients in this view yet.'}</strong><span>{query ? 'Try a different name or email.' : 'Change the saved view or invite your first client when the pilot opens.'}</span></section>}
    <p className="coach-roster-footnote"><ShieldCheck size={14}/> Check-ins and history are shown only for active relationships with explicit <code>coach_progress</code> consent.</p>
  </section>
}

function ClientRelationships({ relationships }) {
  const relationship = relationships.find((item) => item.state === 'active') || relationships[0] || null
  const coachName = relationship?.trainer_display_name || relationship?.coach_display_name || 'Your Steel Coach'
  return <section className="coach-card coach-profile-card"><div className="coach-profile-main"><CoachAvatar relationship={relationship}/><div className="coach-profile-copy"><span className="eyebrow">YOUR COACH</span><h3>{coachName}</h3><p>{relationship ? 'A consent-led coaching relationship, built around your goals.' : 'Your Coach profile will appear here when you accept an invitation.'}</p><div className="coach-profile-tags"><span>Training</span><span>Progress</span><span>On your terms</span></div></div><div className="coach-profile-status">{relationship ? <RelationshipBadge state={relationship.state}/> : <span className="coach-state-badge"><span aria-hidden="true" />Not connected</span>}</div></div><div className="coach-profile-footer"><span><ShieldCheck size={15}/> You control what your Coach can see.</span>{relationship?.state === 'accepted_pending_consent' && <button type="button" className="text-link" disabled>Review consent <ChevronRight size={14}/></button>}</div><p className="coach-privacy-note"><ShieldCheck size={15}/> Workout, nutrition, weight and movement history stays yours unless you explicitly grant Coach progress access.</p></section>
}

function ReviewQueue() {
  const [applications, setApplications] = useState([])
  const [notes, setNotes] = useState({})
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const refresh = useCallback(async () => {
    try { setApplications(await loadCoachApplications()) }
    catch (error) { setMessage(error.message || 'Coach applications could not be loaded.') }
  }, [])

  useEffect(() => {
    // This must not return a Promise: React treats an effect return value as cleanup.
    void refresh()
  }, [refresh])

  async function review(applicationId, state) {
    setBusyId(applicationId)
    setMessage('')
    try {
      await reviewCoachApplication({ id: applicationId, state, note: notes[applicationId] || '' })
      setNotes((current) => ({ ...current, [applicationId]: '' }))
      await refresh()
    } catch (error) { setMessage(error.message || 'The application could not be updated.') }
    finally { setBusyId('') }
  }

  async function activate(applicationId) {
    setBusyId(applicationId)
    setMessage('')
    try {
      const result = await activateCoachApplication(applicationId)
      setMessage(result.message)
      await refresh()
    } catch (error) { setMessage(error.message || 'Coach activation could not be completed.') }
    finally { setBusyId('') }
  }

  return <section className="coach-card coach-review-queue">
    <div className="coach-card-heading"><div><span className="eyebrow">PRIVATE REVIEW QUEUE</span><h3>Coach applications</h3></div><ShieldCheck size={19}/></div>
    <p>Applications arrive here for a human decision. Approval does not publish a profile until activation is confirmed.</p>
    {message && <p className="coach-review-message" role="status">{message}</p>}
    {applications.length ? <div className="coach-review-list">{applications.map((application) => <article key={application.id}>
      <div className="coach-review-summary"><div><strong>{application.full_name}</strong><span>{application.headline}</span><small>{application.email} · {new Date(application.created_at).toLocaleDateString('en-GB')}</small></div><span className={`coach-application-state state-${application.state}`}>{application.state.replace('_', ' ')}</span></div>
      <p>{application.bio}</p><div className="coach-profile-tags">{application.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}</div>
      <label>Reviewer note<textarea value={notes[application.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Optional note for the audit trail" /></label>
      <div className="coach-review-actions">{application.state === 'approved' ? <button className="gold-button" disabled={busyId === application.id} onClick={() => activate(application.id)}>Activate Coach</button> : <><button disabled={busyId === application.id} onClick={() => review(application.id, 'returned')}>Return</button><button className="gold-button" disabled={busyId === application.id} onClick={() => review(application.id, 'approved')}>Approve</button></>}</div>
    </article>)}</div> : <div className="coach-queue-empty"><CheckCircle2 size={20}/><span>No applications need review.</span></div>}
  </section>
}

function CoachSettingsPanel({ accountName, accountEmail, avatarUrl, onSignOut }) {
  return <section className="coach-settings-layout">
    <div className="coach-settings-heading"><span className="eyebrow">ACCOUNT</span><h2>Coach settings</h2><p>Manage your Coach profile and workspace access.</p></div>
    <article className="coach-card coach-account-card"><div className="coach-account-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={24}/>}</div><div><span className="eyebrow">SIGNED IN AS</span><strong>{accountName || 'Coach account'}</strong><small>{accountEmail || 'Authenticated Steel account'}</small></div></article>
    <article className="coach-card coach-settings-list"><button type="button" disabled><span><UserRound size={17}/><strong>Profile details</strong><small>Coach bio, photo and availability will be managed here.</small></span><ChevronRight size={17}/></button><button type="button" disabled><span><ShieldCheck size={17}/><strong>Privacy &amp; permissions</strong><small>Review client visibility and consent defaults.</small></span><ChevronRight size={17}/></button><button type="button" className="coach-signout-button" onClick={onSignOut}><span><LogOut size={17}/><strong>Sign out</strong><small>End this Coach session on this device.</small></span><ChevronRight size={17}/></button></article>
  </section>
}

export default function CoachWorkspace({ userRole, relationships = [], loading = false, error = '', onRefresh, aiCoachAggregate = null, accountName = '', accountEmail = '', avatarUrl = '', onSignOut }) {
  const isTrainer = userRole === 'trainer' || userRole === 'admin'
  const isAdmin = userRole === 'admin'
  const sectionOptions = useMemo(() => isTrainer ? coachSections : [{ id: 'overview', label: 'My Coach', icon: UserRound }, { id: 'messages', label: 'Messages', icon: MessageSquare }, { id: 'settings', label: 'Settings', icon: Settings }], [isTrainer])
  const sectionIds = useMemo(() => sectionOptions.map(({ id }) => id), [sectionOptions])
  const sectionStorageKey = `steel:coach-section:${accountEmail || 'default'}`
  const initialRoute = parseCoachRoute(typeof window === 'undefined' ? '' : window.location.hash, sectionIds)
  const [section, setSection] = useState(initialRoute.section)
  const [selectedClientId, setSelectedClientId] = useState(initialRoute.clientId || '')

  useEffect(() => {
    const routeForHash = () => parseCoachRoute(window.location.hash, sectionIds)
    const hasHash = Boolean(window.location.hash.replace(/^#/, '').trim())
    let initial = routeForHash()
    try {
      const saved = window.localStorage.getItem(sectionStorageKey)
      if (!hasHash && saved && sectionIds.includes(saved)) initial = { section: saved, clientId: null }
    } catch { /* private browsing can disable local storage */ }
    setSection(initial.section)
    setSelectedClientId(initial.clientId || '')
    const expectedHash = formatCoachRoute(initial)
    if (window.location.hash !== expectedHash) {
      window.history.replaceState({ ...(window.history.state || {}), steelCoachRoute: initial }, '', coachRouteUrl(initial))
    } else if (!window.history.state?.steelCoachRoute) {
      window.history.replaceState({ ...(window.history.state || {}), steelCoachRoute: initial }, '', coachRouteUrl(initial))
    }
    const syncRoute = () => {
      const next = routeForHash()
      setSection(next.section)
      setSelectedClientId(next.clientId || '')
      try { window.localStorage.setItem(sectionStorageKey, next.section) } catch { /* private browsing can disable local storage */ }
    }
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => { window.removeEventListener('popstate', syncRoute); window.removeEventListener('hashchange', syncRoute) }
  }, [sectionIds, sectionStorageKey])

  const navigateCoach = (nextRoute, { replace = false } = {}) => {
    const route = typeof nextRoute === 'function' ? nextRoute({ section, clientId: selectedClientId || null }) : nextRoute
    if (!sectionIds.includes(route.section)) return
    const safeRoute = { section: route.section, clientId: route.section === 'clients' ? (route.clientId || null) : null }
    setSection(safeRoute.section)
    setSelectedClientId(safeRoute.clientId || '')
    try { window.localStorage.setItem(sectionStorageKey, safeRoute.section) } catch { /* private browsing can disable local storage */ }
    const url = coachRouteUrl(safeRoute)
    const method = replace ? 'replaceState' : 'pushState'
    if (window.location.hash !== formatCoachRoute(safeRoute) || replace) {
      const historyState = { ...(window.history.state || {}), steelCoachRoute: safeRoute }
      if (!replace) historyState.steelCoachFrom = { section, clientId: selectedClientId || null }
      window.history[method](historyState, '', url)
    }
  }

  const selectSection = (nextSection) => navigateCoach({ section: nextSection, clientId: null })
  const openClient = (clientId) => navigateCoach({ section: 'clients', clientId })
  const backToClients = () => {
    const currentRoute = parseCoachRoute(window.location.hash, sectionIds)
    const previous = window.history.state?.steelCoachFrom
    if (currentRoute.clientId && previous?.section === 'clients' && previous?.clientId === null) {
      window.history.back()
      return
    }
    navigateCoach({ section: 'clients', clientId: null }, { replace: true })
  }
  const activeCount = useMemo(() => relationships.filter((relationship) => relationship.state === 'active').length, [relationships])
  const pendingCount = useMemo(() => relationships.filter((relationship) => ['invited', 'accepted_pending_consent'].includes(relationship.state)).length, [relationships])

  return <div className="coach-console-app">
    <aside className="coach-sidebar"><div className="coach-sidebar-brand"><div className="coach-sidebar-mark"><SteelMark size={24}/></div><div><strong>PROJECT <span>STEEL</span></strong><small>COACH WORKSPACE</small></div></div><div className="coach-sidebar-divider"/><nav aria-label="Coach workspace navigation" className="coach-sidebar-nav">{sectionOptions.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => selectSection(id)}><Icon size={18}/><span>{id === 'overview' && !isTrainer ? 'My Coach' : label}</span>{id === 'clients' && isTrainer && <em>{relationships.length}</em>}</button>)}</nav><div className="coach-sidebar-bottom"><div className="coach-sidebar-profile"><div className="coach-sidebar-avatar">{avatarUrl ? <img src={avatarUrl} alt=""/> : <UserRound size={18}/>}</div><div><strong>{accountName || 'Coach account'}</strong><small>{isTrainer ? 'Trainer access' : 'Client access'}</small></div></div><button type="button" className="coach-sidebar-signout" onClick={onSignOut}><LogOut size={16}/><span>Sign out</span></button></div></aside>
    <div className="coach-main"><header className="coach-topbar"><div className="coach-mobile-brand"><div className="coach-sidebar-mark"><SteelMark size={22}/></div><div><strong>STEEL <span>COACH</span></strong><small>Workspace</small></div></div><div className="coach-topbar-copy"><span className="eyebrow">{isTrainer ? 'COACH WORKSPACE' : 'YOUR COACH'}</span><h1>{sectionOptions.find((item) => item.id === section)?.label || 'Overview'}</h1></div><div className="coach-topbar-actions"><button type="button" className="coach-topbar-refresh" onClick={onRefresh} disabled={loading} aria-label="Refresh status"><RefreshCw size={16} className={loading ? 'coach-spin' : ''}/><span>{loading ? 'Refreshing…' : 'Refresh'}</span></button><button type="button" className="coach-topbar-profile" onClick={() => selectSection('settings')}><span className="coach-sidebar-avatar">{avatarUrl ? <img src={avatarUrl} alt=""/> : <UserRound size={17}/>}</span><span>{accountName || 'Profile'}</span><ChevronRight size={14}/></button></div></header><section className="coach-content"><section className="coach-page-intro"><div className="coach-hero-mark"><PersonStanding size={24} strokeWidth={1.8}/></div><div><span className="eyebrow">STEEL COACH</span><h2>{isTrainer ? 'Your coaching workspace.' : 'Your Coach, on your terms.'}</h2><p>{isTrainer ? 'A calm cockpit for thoughtful, consent-led coaching.' : 'A clear place to understand and control any Coach relationship.'}</p></div><span className="coach-preview-badge">Pilot workspace</span></section>{error ? <EmptyCoachPanel icon={CircleAlert} eyebrow="COACH TESTING" title="Coach data is temporarily unavailable." copy={error} action={<button type="button" className="coach-disabled-action" onClick={onRefresh}>Try again</button>} /> : loading ? <section className="coach-loading-card" role="status"><RefreshCw size={20} className="coach-spin"/><span>Checking your Coach relationship…</span></section> : section === 'settings' ? <CoachSettingsPanel accountName={accountName} accountEmail={accountEmail} avatarUrl={avatarUrl} onSignOut={onSignOut}/> : isTrainer ? section === 'overview' ? <CoachDashboard relationships={relationships} activeCount={activeCount} pendingCount={pendingCount} aiCoachAggregate={aiCoachAggregate} accountEmail={accountEmail} isAdmin={isAdmin}/> : section === 'clients' ? <CoachClientsPanel relationships={relationships} accountEmail={accountEmail} selectedId={selectedClientId} onOpenClient={openClient} onBack={backToClients}/> : section === 'messages' ? <EmptyCoachPanel icon={MessageSquare} eyebrow="MESSAGES" title="Conversations are coming after the pilot workflow." copy="Steel will keep client messages separate from health signals, with clear notification controls and an auditable history." /> : <AiCoachTestingPanel aggregate={aiCoachAggregate}/> : section === 'overview' ? <ClientRelationships relationships={relationships}/> : <EmptyCoachPanel icon={MessageSquare} eyebrow="MESSAGES" title="Private Coach messages are planned." copy="When messaging is enabled, you’ll be able to keep the conversation separate from progress permissions and control notifications." />}{!isTrainer && section === 'overview' && <section className="coach-client-links"><button type="button" className="coach-link-card" disabled><CalendarDays size={18}/><span><strong>Book a session</strong><small>Your Coach’s Calendly or Google Calendar link will appear here.</small></span><ChevronRight size={17}/></button></section>}</section><nav className="coach-mobile-nav" aria-label="Coach workspace mobile navigation">{sectionOptions.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => selectSection(id)}><Icon size={18}/><span>{id === 'overview' && !isTrainer ? 'My Coach' : label}</span></button>)}</nav></div>
  </div>
}
