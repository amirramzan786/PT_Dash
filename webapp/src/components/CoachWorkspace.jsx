import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronRight, CircleAlert, MessageSquare, RefreshCw, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'

const coachSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'clients', label: 'Clients' },
  { id: 'messages', label: 'Messages' },
  { id: 'insights', label: 'Insights' },
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

function formatState(state) {
  return stateLabels[state] || 'Relationship update'
}

function RelationshipBadge({ state }) {
  return <span className={`coach-state-badge coach-state-${state || 'unknown'}`}><span aria-hidden="true" />{formatState(state)}</span>
}

function EmptyCoachPanel({ icon: Icon, eyebrow, title, copy, action }) {
  return <article className="coach-empty-panel"><span className="coach-empty-icon"><Icon size={22}/></span><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{copy}</p>{action}</div></article>
}

function TrainerOverview({ relationships, activeCount, pendingCount }) {
  return <>
    <section className="coach-stat-grid" aria-label="Coach workspace summary">
      <article><UsersRound size={18}/><span>ACTIVE CLIENTS</span><strong>{activeCount}</strong><small>Consent-led relationships</small></article>
      <article><CircleAlert size={18}/><span>AWAITING ACTION</span><strong>{pendingCount}</strong><small>Invites or consent steps</small></article>
      <article><Sparkles size={18}/><span>COACH SIGNALS</span><strong>0</strong><small>Insight engine is next</small></article>
    </section>
    <section className="coach-card-grid">
      <article className="coach-card coach-cockpit-card"><div className="coach-card-heading"><div><span className="eyebrow">COACH COCKPIT</span><h3>A calm view of the work that matters.</h3></div><ShieldCheck size={19}/></div><p>When a client has explicitly shared Coach progress, this space will surface adherence, momentum and follow-up prompts without changing their plan silently.</p><div className="coach-guardrail"><CheckCircle2 size={16}/><span>Client consent is required before progress appears here.</span></div></article>
      <article className="coach-card coach-workflow-card"><div className="coach-card-heading"><div><span className="eyebrow">WORKFLOW PREVIEW</span><h3>The Coach loop</h3></div><ChevronRight size={18}/></div><div className="coach-workflow-list"><div><span>01</span><p><strong>Connect</strong><small>Invite a client and wait for acceptance.</small></p></div><div><span>02</span><p><strong>Understand</strong><small>Review consented progress signals.</small></p></div><div><span>03</span><p><strong>Coach</strong><small>Ask, agree and adjust together.</small></p></div></div></article>
    </section>
    {!relationships.length && <EmptyCoachPanel icon={UsersRound} eyebrow="FIRST PILOT" title="Your first client will appear here." copy="The invite flow is deliberately held for the Coach pilot. Once a relationship is accepted and consented, clients will land in this workspace." action={<button type="button" className="coach-disabled-action" disabled>Invite client · pilot setup next</button>}/>} 
  </>
}

function ClientRelationships({ relationships }) {
  if (!relationships.length) return <EmptyCoachPanel icon={ShieldCheck} eyebrow="YOUR CONTROL" title="No Coach relationship yet." copy="If a Coach invites you, you’ll see the invitation here first. Your workout, nutrition, weight and movement history stays yours unless you explicitly grant Coach progress access." />
  return <section className="coach-card coach-relationships-card"><div className="coach-card-heading"><div><span className="eyebrow">RELATIONSHIPS</span><h3>Your Coach access</h3></div><ShieldCheck size={19}/></div><div className="coach-relationship-list">{relationships.map((relationship) => <article key={relationship.id}><div><strong>Coach relationship</strong><small>Updated {new Date(relationship.updated_at || relationship.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></div><RelationshipBadge state={relationship.state}/>{relationship.state === 'accepted_pending_consent' && <button type="button" className="text-link" disabled>Review consent <ChevronRight size={14}/></button>}</article>)}</div><p className="coach-privacy-note"><ShieldCheck size={15}/> Progress sharing is purpose-specific, revocable and never silently changes your plan.</p></section>
}

export default function CoachWorkspace({ userRole, relationships = [], loading = false, onRefresh }) {
  const [section, setSection] = useState('overview')
  const isTrainer = userRole === 'trainer'
  const sectionOptions = isTrainer ? coachSections : [{ id: 'overview', label: 'My Coach' }, { id: 'messages', label: 'Messages' }]
  const activeCount = useMemo(() => relationships.filter((relationship) => relationship.state === 'active').length, [relationships])
  const pendingCount = useMemo(() => relationships.filter((relationship) => ['invited', 'accepted_pending_consent'].includes(relationship.state)).length, [relationships])

  return <div className="page-stack coach-page">
    <section className="coach-hero"><div className="coach-hero-mark"><Sparkles size={25}/></div><div><span className="eyebrow">STEEL COACH</span><h2>{isTrainer ? 'Your coaching workspace.' : 'Your Coach, on your terms.'}</h2><p>{isTrainer ? 'A mobile-first cockpit for thoughtful, consent-led coaching.' : 'A clear place to understand and control any Coach relationship.'}</p></div><span className="coach-preview-badge">Foundation preview</span></section>
    <div className="coach-role-row"><span className="coach-role-pill"><ShieldCheck size={15}/>{isTrainer ? 'Coach workspace' : 'Client-owned access'}</span><button type="button" className="coach-refresh-button" onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading ? 'coach-spin' : ''}/> {loading ? 'Refreshing…' : 'Refresh status'}</button></div>
    <nav className="coach-section-nav" aria-label="Coach workspace sections">{sectionOptions.map(({ id, label }) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{label}{id === 'clients' && isTrainer && <span>{relationships.length}</span>}</button>)}</nav>
    {loading ? <section className="coach-loading-card" role="status"><RefreshCw size={20} className="coach-spin"/><span>Checking your Coach relationship…</span></section> : isTrainer ? section === 'overview' ? <TrainerOverview relationships={relationships} activeCount={activeCount} pendingCount={pendingCount}/> : section === 'clients' ? <section className="coach-card coach-relationships-card"><div className="coach-card-heading"><div><span className="eyebrow">CLIENTS</span><h3>Client relationships</h3></div><UsersRound size={19}/></div>{relationships.length ? <div className="coach-relationship-list">{relationships.map((relationship) => <article key={relationship.id}><div><strong>Client relationship</strong><small>Updated {new Date(relationship.updated_at || relationship.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></div><RelationshipBadge state={relationship.state}/><ChevronRight size={17}/></article>)}</div> : <p className="muted-copy">Your consented client list will appear here.</p>}</section> : section === 'messages' ? <EmptyCoachPanel icon={MessageSquare} eyebrow="MESSAGES" title="Conversations are coming after the pilot workflow." copy="Steel will keep client messages separate from health signals, with clear notification controls and an auditable history." /> : <EmptyCoachPanel icon={Sparkles} eyebrow="INSIGHTS" title="Signals, not silent decisions." copy="The future insight engine will flag patterns such as missed sessions or stalled progress, ask the right questions and wait for agreement before a plan changes." /> : section === 'overview' ? <ClientRelationships relationships={relationships}/> : <EmptyCoachPanel icon={MessageSquare} eyebrow="MESSAGES" title="Private Coach messages are planned." copy="When messaging is enabled, you’ll be able to keep the conversation separate from progress permissions and control notifications." />}
    {!isTrainer && <section className="coach-client-links"><button type="button" className="coach-link-card" disabled><CalendarDays size={18}/><span><strong>Coach bookings</strong><small>Scheduling will be added after the pilot workflow.</small></span><ChevronRight size={17}/></button><button type="button" className="coach-link-card" disabled><MessageSquare size={18}/><span><strong>Coach messages</strong><small>Private conversations are planned for a later slice.</small></span><ChevronRight size={17}/></button></section>}
  </div>
}
