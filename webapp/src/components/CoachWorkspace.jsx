import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, CircleAlert, MessageSquare, PersonStanding, RefreshCw, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { activateCoachApplication, loadCoachApplications, loadCoachProfile, reviewCoachApplication, saveCoachProfile } from '../lib/steelApi'

const coachSections = ['overview', 'clients', 'messages', 'insights']
const emptyProfile = { state: 'draft', display_name: '', headline: '', bio: '', specialties: [], coaching_style: '', ideal_client: '', service_boundaries: '', timezone: 'Europe/London', availability_note: '', qualification_status: 'not_declared', insurance_status: 'not_declared', safeguarding_acknowledged: false, privacy_ai_agreement_acknowledged: false }
const stateLabels = { invited: 'Invitation sent', accepted_pending_consent: 'Awaiting consent', active: 'Active', paused: 'Paused', transfer_pending: 'Transfer requested', revoked: 'Revoked', expired: 'Expired' }

function RelationshipBadge({ state }) {
  return <span className={`coach-state-badge coach-state-${state || 'unknown'}`}><span aria-hidden="true" />{stateLabels[state] || 'Relationship update'}</span>
}

function EmptyCoachPanel({ icon: Icon, eyebrow, title, copy }) {
  return <article className="coach-empty-panel"><span className="coach-empty-icon"><Icon size={22}/></span><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{copy}</p></div></article>
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
    // Never return this Promise. React treats returned values as cleanup
    // functions, which caused the live navigation crash after opening Coach.
    void refresh()
  }, [refresh])

  async function review(applicationId, state) {
    setBusyId(applicationId); setMessage('')
    try {
      await reviewCoachApplication({ id: applicationId, state, note: notes[applicationId] || '' })
      setNotes((current) => ({ ...current, [applicationId]: '' }))
      await refresh()
    } catch (error) { setMessage(error.message || 'The application could not be updated.') }
    finally { setBusyId('') }
  }

  async function activate(applicationId) {
    setBusyId(applicationId); setMessage('')
    try { const result = await activateCoachApplication(applicationId); setMessage(result.message); await refresh() }
    catch (error) { setMessage(error.message || 'Coach activation could not be completed.') }
    finally { setBusyId('') }
  }

  return <section className="coach-card coach-review-queue">
    <div className="coach-card-heading"><div><span className="eyebrow">PRIVATE REVIEW QUEUE</span><h3>Coach applications</h3></div><ShieldCheck size={19}/></div>
    <p>Public applications arrive here for a human decision. Approval does not publish a profile until activation is confirmed.</p>
    {message && <p className="coach-review-message" role="status">{message}</p>}
    {applications.length ? <div className="coach-review-list">{applications.map((application) => <article key={application.id}>
      <div className="coach-review-summary"><div><strong>{application.full_name}</strong><span>{application.headline}</span><small>{application.email} · {new Date(application.created_at).toLocaleDateString('en-GB')}</small></div><span className={`coach-application-state state-${application.state}`}>{application.state.replace('_', ' ')}</span></div>
      <p>{application.bio}</p><div className="coach-profile-tags">{application.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}</div>
      <label>Reviewer note<textarea value={notes[application.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Optional note for the audit trail" /></label>
      <div className="coach-review-actions">{application.state === 'approved' ? <button className="gold-button" disabled={busyId === application.id} onClick={() => activate(application.id)}>Activate Coach</button> : <><button disabled={busyId === application.id} onClick={() => review(application.id, 'returned')}>Return</button><button className="gold-button" disabled={busyId === application.id} onClick={() => review(application.id, 'approved')}>Approve</button></>}</div>
    </article>)}</div> : <div className="coach-queue-empty"><CheckCircle2 size={20}/><span>No applications need review.</span></div>}
  </section>
}

function CoachOnboarding() {
  const [profile, setProfile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void loadCoachProfile().then((value) => { if (active) setProfile(value || emptyProfile) }).catch(() => { if (active) { setProfile(emptyProfile); setMessage('Your Coach profile could not be loaded.') } })
    return () => { active = false }
  }, [])

  async function persist(state) {
    if (!profile || busy) return
    if (state === 'submitted') {
      const ready = profile.display_name?.trim().length >= 2 && profile.headline?.trim().length >= 8 && profile.bio?.trim().length >= 80 && profile.specialties?.length && profile.qualification_status === 'declared' && profile.insurance_status === 'declared' && profile.safeguarding_acknowledged && profile.privacy_ai_agreement_acknowledged
      if (!ready) { setMessage('Complete your name, headline, 80-character bio, specialisms and all professional declarations before submitting.'); return }
    }
    setBusy(true); setMessage('')
    try { const next = await saveCoachProfile({ ...profile, state }); setProfile(next); setMessage(state === 'submitted' ? 'Submitted to Steel for review.' : 'Draft saved privately.') }
    catch (error) { setMessage(error.message || 'Your Coach profile could not be saved.') }
    finally { setBusy(false) }
  }

  if (!profile) return <section className="coach-card coach-loading-card"><RefreshCw className="coach-spin" size={20}/> Preparing your private Coach profile…</section>
  if (['submitted', 'approved', 'unpublished'].includes(profile.state)) return <section className="coach-card coach-onboarding-status"><span className="eyebrow">COACH ONBOARDING</span><h3>{profile.state === 'submitted' ? 'Your profile is under review.' : profile.state === 'approved' ? 'Your Coach profile is approved.' : 'Your Coach profile is unpublished.'}</h3><p>{profile.review_note || 'Steel will contact you if anything is needed. Your profile is not visible to members until it is approved.'}</p></section>

  const setField = (key, value) => setProfile((current) => ({ ...current, [key]: value }))
  return <section className="coach-card coach-onboarding-card"><div className="coach-card-heading"><div><span className="eyebrow">COACH ONBOARDING</span><h3>Build your professional profile.</h3></div><ShieldCheck size={19}/></div><p>Complete this after your application invite. Everything stays private until Steel approves it.</p><div className="coach-profile-form">
    <label>Display name<input value={profile.display_name || ''} onChange={(event) => setField('display_name', event.target.value)} /></label><label>Headline<input value={profile.headline || ''} onChange={(event) => setField('headline', event.target.value)} placeholder="Strength Coach for busy professionals" /></label><label className="wide">Bio<textarea value={profile.bio || ''} onChange={(event) => setField('bio', event.target.value)} /></label><label>Specialisms<input value={(profile.specialties || []).join(', ')} onChange={(event) => setField('specialties', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Strength, body composition" /></label><label>Availability<input value={profile.availability_note || ''} onChange={(event) => setField('availability_note', event.target.value)} /></label><label className="wide">Ideal client<textarea value={profile.ideal_client || ''} onChange={(event) => setField('ideal_client', event.target.value)} /></label><label className="wide">Coaching style<textarea value={profile.coaching_style || ''} onChange={(event) => setField('coaching_style', event.target.value)} /></label><label className="wide">Service boundaries<textarea value={profile.service_boundaries || ''} onChange={(event) => setField('service_boundaries', event.target.value)} placeholder="What you provide, what you do not provide, and when you refer on." /></label>
    <label className="coach-check"><input type="checkbox" checked={profile.qualification_status === 'declared'} onChange={(event) => setField('qualification_status', event.target.checked ? 'declared' : 'not_declared')} /> My qualifications are current and appropriate.</label><label className="coach-check"><input type="checkbox" checked={profile.insurance_status === 'declared'} onChange={(event) => setField('insurance_status', event.target.checked ? 'declared' : 'not_declared')} /> I hold current professional insurance.</label><label className="coach-check"><input type="checkbox" checked={profile.safeguarding_acknowledged} onChange={(event) => setField('safeguarding_acknowledged', event.target.checked)} /> I accept Steel’s safeguarding expectations.</label><label className="coach-check"><input type="checkbox" checked={profile.privacy_ai_agreement_acknowledged} onChange={(event) => setField('privacy_ai_agreement_acknowledged', event.target.checked)} /> I accept Steel’s privacy and AI-use boundary.</label>
  </div>{message && <p className="coach-review-message" role="status">{message}</p>}<div className="coach-review-actions"><button disabled={busy} onClick={() => persist('draft')}>Save draft</button><button className="gold-button" disabled={busy} onClick={() => persist('submitted')}>Submit for review</button></div></section>
}

function TrainerOverview({ relationships, activeCount, pendingCount, isAdmin }) {
  return <><section className="coach-stat-grid" aria-label="Coach workspace summary"><article><UsersRound size={18}/><span>ACTIVE CLIENTS</span><strong>{activeCount}</strong><small>Consent-led relationships</small></article><article><CircleAlert size={18}/><span>AWAITING ACTION</span><strong>{pendingCount}</strong><small>Invites or consent steps</small></article><article><Sparkles size={18}/><span>COACH SIGNALS</span><strong>0</strong><small>Insight engine is next</small></article></section>{isAdmin ? <ReviewQueue/> : <CoachOnboarding/>}{!relationships.length && <EmptyCoachPanel icon={UsersRound} eyebrow="FIRST PILOT" title="Your first client will appear here." copy="Once a relationship is accepted and consented, clients will land in this workspace." />}</>
}

export default function CoachWorkspace({ userRole, relationships = [], loading = false, onRefresh }) {
  const [section, setSection] = useState('overview')
  const isAdmin = userRole === 'admin'
  const activeCount = useMemo(() => relationships.filter((item) => item.state === 'active').length, [relationships])
  const pendingCount = useMemo(() => relationships.filter((item) => ['invited', 'accepted_pending_consent'].includes(item.state)).length, [relationships])
  return <div className="page-stack coach-page"><section className="coach-hero"><div className="coach-hero-mark"><PersonStanding size={27}/></div><div><span className="eyebrow">STEEL COACH</span><h2>Your coaching workspace.</h2><p>A separate, consent-led operating space for approved Coaches.</p></div><span className="coach-preview-badge">Private pilot</span></section><div className="coach-role-row"><span className="coach-role-pill"><ShieldCheck size={15}/>{isAdmin ? 'Steel administrator' : 'Coach workspace'}</span><button type="button" className="coach-refresh-button" onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading ? 'coach-spin' : ''}/> {loading ? 'Refreshing…' : 'Refresh status'}</button></div><nav className="coach-section-nav" aria-label="Coach workspace sections">{coachSections.map((id) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{id[0].toUpperCase() + id.slice(1)}{id === 'clients' && <span>{relationships.length}</span>}</button>)}</nav>{loading ? <section className="coach-loading-card"><RefreshCw size={20} className="coach-spin"/> Checking your Coach relationships…</section> : section === 'overview' ? <TrainerOverview relationships={relationships} activeCount={activeCount} pendingCount={pendingCount} isAdmin={isAdmin}/> : section === 'clients' ? <section className="coach-card coach-relationships-card"><div className="coach-card-heading"><div><span className="eyebrow">CLIENTS</span><h3>Client relationships</h3></div><UsersRound size={19}/></div>{relationships.length ? <div className="coach-relationship-list">{relationships.map((relationship) => <article key={relationship.id}><div><strong>Client relationship</strong><small>Updated {new Date(relationship.updated_at || relationship.created_at).toLocaleDateString('en-GB')}</small></div><RelationshipBadge state={relationship.state}/><ChevronRight size={17}/></article>)}</div> : <p className="muted-copy">Your consented client list will appear here.</p>}</section> : section === 'messages' ? <EmptyCoachPanel icon={MessageSquare} eyebrow="MESSAGES" title="Conversations follow the pilot workflow." copy="Messages remain separate from health signals, with clear notification controls and an auditable history." /> : <EmptyCoachPanel icon={Sparkles} eyebrow="INSIGHTS" title="Signals, not silent decisions." copy="Insights remain explainable, consent-led and subject to Coach judgement." />}</div>
}
