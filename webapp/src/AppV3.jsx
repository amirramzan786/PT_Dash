import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, Camera, Check, ChevronDown, ChevronRight, Dumbbell, Flame,
  Footprints, Home, LineChart, LogOut, Play, RotateCcw, Save, Scale,
  ShieldCheck, Trash2, UserRound, Watch, ListChecks,
} from 'lucide-react'
import {
  getDashboardStats, getProfile, getRecentSessions, getTodaySteps, getStepHistory, getWeightHistory,
  loadWorkouts, saveProfile, saveWeight, saveWorkoutSession, updateAccount, uploadAvatar,
} from './lib/steelApi'
import './app-v2.css'
import './settings.css'
import './v3.css'

const tabs = [
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'Plan', label: 'Workouts', icon: Dumbbell },
  { id: 'Train', label: 'Train', icon: Activity },
  { id: 'Progress', label: 'Progress', icon: LineChart },
  { id: 'Weight', label: 'Weight', icon: Scale },
]

function makeDraft(workout) {
  return {
    step: 0,
    removedExercises: [],
    sets: Object.fromEntries(workout.exercises.map((exercise) => [exercise.id,
      Array.from({ length: exercise.sets }, (_, index) => ({ setNo: index + 1, weight: 0, reps: 10, complete: false, removed: false })),
    ])),
    cardio: { complete: true, minutes: 7, incline: 6, rpe: 6 },
  }
}

function formatDate(value) {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function WeightChart({ data }) {
  if (!data.length) return <div className="empty-chart">Log your first weight to start the trend.</div>
  const values = data.map((item) => Number(item.weight_lb))
  const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1)
  const points = values.map((value, index) => `${data.length === 1 ? 50 : (index / (data.length - 1)) * 100},${88 - ((value - min) / range) * 68}`).join(' ')
  return <svg className="weight-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Body weight trend"><polyline className="chart-line" points={points} /></svg>
}

function StepsChart({ data }) {
  if (!data.length) return <div className="empty-chart">Step history will appear when your health data syncs.</div>
  const values = data.map((item) => Number(item.steps || 0)); const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${data.length === 1 ? 50 : (index / (data.length - 1)) * 100},${88 - (value / max) * 68}`).join(' ')
  return <svg className="steps-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Steps over the last 30 days"><polyline className="chart-line" points={points} /></svg>
}

function Avatar({ url, size = 36 }) {
  return url ? <img className="profile-image" src={url} alt="Profile" style={{ width: size, height: size }} /> : <span className="account-avatar" style={{ width: size, height: size }}><UserRound size={Math.max(17, size * .45)} /></span>
}

export default function AppV3({ user, onSignOut }) {
  const [tab, setTab] = useState('Home')
  const [settingsReturnTab, setSettingsReturnTab] = useState('Home')
  const [workouts, setWorkouts] = useState([])
  const [stats, setStats] = useState({ latestWeightLb: null, sessionCount: 0 })
  const [steps, setSteps] = useState({ steps: 0, source: null })
  const [stepHistory, setStepHistory] = useState([])
  const [weights, setWeights] = useState([])
  const [sessions, setSessions] = useState([])
  const [profile, setProfile] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [weightInput, setWeightInput] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState(user.email || '')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')
  const [progressOpen, setProgressOpen] = useState(false)

  async function refresh() {
    const [programme, dashboard, todaySteps, stepHistoryRows, history, recent, profileRow] = await Promise.all([
      loadWorkouts(user.id), getDashboardStats(user.id), getTodaySteps(user.id),
      getStepHistory(user.id, 31),
      getWeightHistory(user.id, 30), getRecentSessions(user.id, 8), getProfile(user.id),
    ])
    setWorkouts(programme); setStats(dashboard); setSteps(todaySteps); setStepHistory(stepHistoryRows); setWeights(history); setSessions(recent); setProfile(profileRow)
    const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'
    setProfileName(profileRow?.display_name || fallbackName)
    setProfileEmail(user.email || '')
    if (!selectedId && programme[0]) setSelectedId(programme[0].id)
  }

  useEffect(() => { let active = true; setBusy(true); refresh().catch((e) => active && setMessage(e.message)).finally(() => active && setBusy(false)); return () => { active = false } }, [user.id])

  const selectedWorkout = useMemo(() => workouts.find((w) => w.id === selectedId) || workouts[0] || null, [workouts, selectedId])
  const activeExercises = selectedWorkout && draft ? selectedWorkout.exercises.filter((e) => !draft.removedExercises.includes(e.id)) : []
  const atFinisher = Boolean(draft && draft.step >= activeExercises.length)
  const currentExercise = draft && !atFinisher ? activeExercises[draft.step] : null
  const firstName = (profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'there').split(' ')[0]
  const accountName = profile?.display_name || user.user_metadata?.full_name || firstName
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const latestWeight = stats.latestWeightLb ? Number(stats.latestWeightLb) : null
  const previousWeight = weights.length > 1 ? Number(weights.at(-2).weight_lb) : null
  const weightDelta = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null

  function openSettings() { if (tab !== 'Settings') setSettingsReturnTab(tab); setTab('Settings'); setMessage('') }
  function closeSettings() { setTab(settingsReturnTab || 'Home'); setMessage('') }
  function openWorkout(workout) { setSelectedId(workout.id); setDraft(makeDraft(workout)); setTab('Train'); setMessage('') }
  function changeWorkout(id) { const w = workouts.find((x) => x.id === id); if (w) { setSelectedId(id); setDraft(makeDraft(w)) } }
  function updateSet(exerciseId, setNo, patch) { setDraft((d) => ({ ...d, sets: { ...d.sets, [exerciseId]: d.sets[exerciseId].map((s) => s.setNo === setNo ? { ...s, ...patch } : s) } })) }
  function moveStep(step) { setDraft((d) => ({ ...d, step: Math.max(0, Math.min(step, activeExercises.length)) })) }
  function removeExercise(id) { setDraft((d) => ({ ...d, removedExercises: [...new Set([...d.removedExercises, id])], step: Math.min(d.step, activeExercises.length - 1) })) }
  function restoreExercise(id) { setDraft((d) => ({ ...d, removedExercises: d.removedExercises.filter((x) => x !== id) })) }

  const completedSets = selectedWorkout && draft ? selectedWorkout.exercises.reduce((total, exercise) => total + (draft.sets[exercise.id] || []).filter((s) => s.complete && !s.removed).length, 0) : 0

  async function saveSession() {
    if (!selectedWorkout || !draft || !completedSets) return
    setSaving(true)
    try { await saveWorkoutSession({ userId: user.id, workout: selectedWorkout, draft }); await refresh(); setDraft(makeDraft(selectedWorkout)); setTab('Home'); setMessage(`Session saved — ${completedSets} sets logged.`) }
    catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  async function submitWeight(event) {
    event.preventDefault(); const value = Number(weightInput); if (!Number.isFinite(value) || value <= 0) return
    setSaving(true)
    try { await saveWeight(user.id, new Date().toISOString().slice(0, 10), value); await refresh(); setWeightInput(''); setMessage(`Weight saved: ${value.toFixed(1)} lb.`) }
    catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  async function saveAccount(event) {
    event.preventDefault(); setSaving(true); setMessage('')
    try {
      await updateAccount({ displayName: profileName.trim(), email: profileEmail.trim() })
      const next = await saveProfile(user.id, { displayName: profileName.trim(), goal: profile?.goal || 'Lose fat and gain muscle', avatarUrl })
      setProfile(next); setMessage(profileEmail.trim() !== user.email ? 'Profile saved. Check your new email address to confirm the email change.' : 'Profile saved.')
    } catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0]; if (!file) return
    setAvatarBusy(true); setMessage('')
    try { const url = await uploadAvatar(user.id, file); const next = await saveProfile(user.id, { displayName: profileName, goal: profile?.goal || 'Lose fat and gain muscle', avatarUrl: url }); setProfile(next); setMessage('Profile photo updated.') }
    catch (e) { setMessage(e.message) } finally { setAvatarBusy(false); event.target.value = '' }
  }

  if (busy) return <div className="v2-loading"><div className="steel-emblem">S</div><span>Loading Steel…</span></div>

  return <div className="steel-app">
    <main className="steel-screen">
      <header className="v2-topbar">
        <div className="brand-lockup"><div className="brand-emblem">S</div><div><div className="eyebrow">PLACEHOLDER FOR COOL TEXT THERE</div><h1>PROJECT <span>STEEL</span></h1></div></div>
        <button className={`account-button ${tab === 'Settings' ? 'active' : ''}`} onClick={openSettings}><Avatar url={avatarUrl} size={32} /><span className="account-copy"><strong>{accountName}</strong><small>Profile</small></span><ChevronRight size={15} /></button>
      </header>
      {message && <div className="toast-note">{message}</div>}

      {tab === 'Home' && <div className="page-stack">
        <section className="v4-welcome-card"><div className="v4-hero-art" aria-hidden="true"><div className="v4-hero-figure" /></div><div className="v4-hero-copy"><span className="eyebrow">WELCOME BACK,</span><h2>{firstName}</h2><p>You’ve got this. Let’s build something strong today.</p></div><div className="v4-metric-grid"><article><Dumbbell size={17}/><span>WORKOUTS</span><strong>{stats.sessionCount}</strong><small>Logged</small></article><article><Flame size={17}/><span>STREAK</span><strong>{stats.streakDays || 0}</strong><small>Days</small></article><article><Activity size={17}/><span>VOLUME</span><strong>{stats.volumeKg ? Math.round(stats.volumeKg).toLocaleString('en-GB') : 0}</strong><small>kg lifted</small></article><article><Scale size={17}/><span>WEIGHT</span><strong>{latestWeight ? latestWeight.toFixed(1) : '—'}</strong><small>lb</small></article></div></section>
        <section className="v4-quick-actions"><div className="section-heading"><div><span className="eyebrow">MAKE IT EASY</span><h3>Quick actions</h3></div></div><div className="v4-action-grid">{workouts[0]&&<button onClick={()=>openWorkout(workouts[0])}><Play/><span>Start workout</span></button>}{workouts[1]&&<button onClick={()=>openWorkout(workouts[1])}><Dumbbell/><span>Push workout</span></button>}<button onClick={()=>setTab('Weight')}><Scale/><span>Log weight</span></button><button onClick={()=>setProgressOpen(true)}><ListChecks/><span>View progress</span></button></div></section>
        <section className="home-utility-grid"><button className="home-utility-card" onClick={() => setTab('Weight')}><Scale size={18}/><span className="eyebrow">BODY WEIGHT</span><strong>{latestWeight ? `${latestWeight.toFixed(1)} lb` : '— lb'}</strong><small>Open Weight <ChevronRight size={13}/></small></button><button className="home-utility-card" onClick={() => setTab('Progress')}><Footprints size={18}/><span className="eyebrow">TODAY’S STEPS</span><strong>{Number(steps.steps || 0).toLocaleString('en-GB')}</strong><small>View Progress <ChevronRight size={13}/></small></button></section>
        <section className="steel-card movement-card"><div className="section-heading"><div><span className="eyebrow">MOVEMENT HISTORY</span><h3>Last 30 days</h3></div><button className="text-link" onClick={() => setTab('Progress')}>View progress <ChevronRight size={14}/></button></div><span className="metric-label">Daily steps trend{steps.source ? ` · synced from ${steps.source}` : ''}</span><StepsChart data={stepHistory}/></section>
        <section><div className="section-heading"><div><span className="eyebrow">YOUR PROGRAMME</span><h3>Choose a workout</h3></div><button className="text-link" onClick={() => setTab('Plan')}>View all</button></div><div className="workout-tile-stack">{workouts.map((w, i) => <button className="workout-tile" key={w.id} onClick={() => openWorkout(w)}><div className={`tile-art tile-art-${i+1}`}><Dumbbell size={30}/></div><div className="tile-copy"><span className="eyebrow">WORKOUT {i+1}</span><strong>{w.name}</strong><small>{w.exercises.length} exercises · {w.duration}</small></div><span className="tile-arrow"><ChevronRight size={19}/></span></button>)}</div></section>
        <section className="v4-progress-section"><button className="v4-progress-heading" onClick={()=>setProgressOpen((open)=>!open)} aria-expanded={progressOpen}><span><span className="eyebrow">AT A GLANCE</span><strong>Progress</strong><small>Relative metrics</small></span><ChevronDown className={progressOpen?'rotated':''}/></button>{progressOpen&&<div className="steel-card v4-progress-card"><div className="v4-progress-top"><strong>This week</strong><span>{sessions.length} recent sessions</span></div><div className="v4-relative-metrics"><div><span>Weekly goal</span><strong>{Math.min(sessions.length,5)} / 5</strong></div><div><span>Check-ins</span><strong>{weights.length}</strong></div><div><span>Sessions total</span><strong>{stats.sessionCount}</strong></div></div></div>}</section>
      </div>}

      {tab === 'Plan' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">YOUR PROGRAMME</span><h2>Workouts</h2><p>Three focused sessions built around efficient machine-led training.</p></section>{workouts.map((w,i)=><article className="plan-block" key={w.id}><div className="plan-image"><div className="plan-image-icon"><Dumbbell size={34}/></div><span>WORKOUT {i+1}</span></div><div className="plan-content"><div className="plan-title-row"><div><h3>{w.name}</h3><p>{w.exercises.length} exercises · {w.duration}</p></div><button className="circle-button" onClick={()=>openWorkout(w)}><ArrowRight size={18}/></button></div><div className="compact-exercise-list">{w.exercises.map((e,n)=><div className="compact-exercise" key={e.id}><span>{n+1}</span><div><strong>{e.name}</strong><small>{e.equipment} · {e.sets} × {e.reps}</small></div></div>)}</div><div className="finisher-badge"><Flame size={15}/> {w.finisher}</div></div></article>)}</div>}

      {tab === 'Train' && <div className="page-stack training-page">{!selectedWorkout || !draft ? <section className="empty-state"><Dumbbell size={34}/><h2>Choose a workout</h2><p>Start from Home or Workouts.</p>{workouts[0]&&<button className="gold-button" onClick={()=>openWorkout(workouts[0])}>Start workout</button>}</section> : <><section className="train-top"><div><span className="eyebrow">ACTIVE WORKOUT</span><h2>{selectedWorkout.name}</h2></div><select value={selectedWorkout.id} onChange={(e)=>changeWorkout(e.target.value)}>{workouts.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></section><div className="train-progress-copy"><span>{atFinisher?'Final step':`Exercise ${draft.step+1} of ${activeExercises.length}`}</span><span>{Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%</span></div><div className="train-progress"><span style={{width:`${Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%`}}/></div>{!atFinisher&&currentExercise&&<><article className="exercise-focus-card"><div className="exercise-visual"><Dumbbell size={48}/></div><div className="exercise-focus-copy"><span className="eyebrow">CURRENT EXERCISE</span><h2>{currentExercise.name}</h2><p>{currentExercise.equipment} · {currentExercise.sets} sets × {currentExercise.reps}</p></div></article><div className="set-list-v2">{(draft.sets[currentExercise.id]||[]).map(set=><article className={`set-row-v2 ${set.complete?'complete':''} ${set.removed?'removed':''}`} key={set.setNo}><div className="set-number">{set.setNo}</div>{!set.removed?<><label><span>KG</span><input type="number" min="0" step="2.5" value={set.weight} onChange={e=>updateSet(currentExercise.id,set.setNo,{weight:Number(e.target.value)||0})}/></label><label><span>REPS</span><input type="number" min="1" value={set.reps} onChange={e=>updateSet(currentExercise.id,set.setNo,{reps:Number(e.target.value)||1})}/></label><div className="set-actions-v2"><button className={set.complete?'done-button done':'done-button'} onClick={()=>updateSet(currentExercise.id,set.setNo,{complete:!set.complete})}><Check size={16}/> {set.complete?'Done':'Complete'}</button><button className="remove-button" onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:true,complete:false})}><Trash2 size={15}/> Remove</button></div></>:<div className="removed-copy"><span>Removed</span><button onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:false})}><RotateCcw size={15}/> Restore</button></div>}</article>)}</div><details className="options-panel"><summary>Exercise options</summary><button className="danger-link" onClick={()=>removeExercise(currentExercise.id)}><Trash2 size={16}/> Remove exercise this session</button></details><div className="train-nav-row"><button disabled={draft.step===0} onClick={()=>moveStep(draft.step-1)}><ArrowLeft size={17}/> Previous</button><button className="gold-button" onClick={()=>moveStep(draft.step+1)}>{draft.step===activeExercises.length-1?'Finisher':'Next'} <ArrowRight size={17}/></button></div></>}{atFinisher&&<><article className="finisher-panel"><div className="finisher-symbol"><Flame size={24}/></div><div><span className="eyebrow">FINISH STRONG</span><h2>Incline cardio</h2><p>7 min · 6% incline · RPE 6</p></div></article><article className="session-summary-v2"><div className="summary-hero"><Check size={20}/><div><span className="eyebrow">SESSION SUMMARY</span><strong>{completedSets} working sets</strong></div></div></article>{draft.removedExercises.length>0&&<details className="options-panel"><summary>Restore removed exercises</summary>{draft.removedExercises.map(id=>{const e=selectedWorkout.exercises.find(x=>x.id===id);return e?<button className="restore-exercise" key={id} onClick={()=>restoreExercise(id)}><RotateCcw size={14}/> {e.name}</button>:null})}</details>}<div className="train-nav-row"><button onClick={()=>moveStep(Math.max(activeExercises.length-1,0))}><ArrowLeft size={17}/> Back</button><button className="gold-button" disabled={!completedSets||saving} onClick={saveSession}><Save size={17}/> {saving?'Saving…':'Save session'}</button></div></>}</>}</div>}

      {tab === 'Progress' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">PROGRESS</span><h2>Your momentum</h2><p>Training consistency and recent sessions without clutter.</p></section><article className="progress-hero-card"><div className="progress-metric"><span className="eyebrow">WORKOUTS LOGGED</span><strong>{stats.sessionCount}</strong><small>Keep stacking sessions.</small></div></article><section className="steel-card"><div className="section-heading"><div><span className="eyebrow">RECENT SESSIONS</span><h3>Training history</h3></div><Dumbbell size={20}/></div>{sessions.length?sessions.map(s=><div className="history-row session-history" key={s.id}><div><strong>{s.workout_name}</strong><span>{formatDate(s.session_date)}</span></div><small>{s.duration_min||45} min</small></div>):<p className="muted-copy">Completed sessions will appear here.</p>}</section></div>}

      {tab === 'Weight' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">WEIGHT</span><h2>Body weight</h2><p>Quick check-ins in lbs with a clean trend view.</p></section><article className="progress-hero-card"><div className="progress-metric"><span className="eyebrow">CURRENT WEIGHT</span><strong>{latestWeight?`${latestWeight.toFixed(1)} lb`:'— lb'}</strong><small>{weightDelta===null?'No comparison yet':`${weightDelta>0?'+':''}${weightDelta.toFixed(1)} lb vs previous`}</small></div><WeightChart data={weights}/></article><form className="weight-entry-card" onSubmit={submitWeight}><div><span className="eyebrow">TODAY</span><h3>Log weight</h3></div><div className="weight-entry-row"><label><input type="number" min="60" max="700" step=".1" placeholder={latestWeight?latestWeight.toFixed(1):'Weight'} value={weightInput} onChange={e=>setWeightInput(e.target.value)}/><span>lb</span></label><button className="gold-button" disabled={saving||!weightInput}><Save size={17}/> Save</button></div></form><section className="steel-card"><div className="section-heading"><div><span className="eyebrow">HISTORY</span><h3>Recent check-ins</h3></div><Scale size={20}/></div>{weights.length?[...weights].reverse().slice(0,8).map(w=><div className="history-row" key={w.id}><span>{formatDate(w.checkin_date)}</span><strong>{Number(w.weight_lb).toFixed(1)} lb</strong></div>):<p className="muted-copy">No check-ins yet.</p>}</section></div>}

      {tab === 'Settings' && <div className="page-stack settings-page"><button className="settings-back-button" type="button" onClick={closeSettings}><ArrowLeft size={17}/> Back</button><section className="page-intro"><span className="eyebrow">PROFILE & SETTINGS</span><h2>Your Steel profile</h2><p>Personalise your account and prepare health syncing.</p></section><article className="settings-profile-card editable-profile"><div className="avatar-upload-wrap"><Avatar url={avatarUrl} size={72}/><label className="avatar-upload-button"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} disabled={avatarBusy}/></label></div><div><span className="eyebrow">DISPLAY PROFILE</span><h3>{accountName}</h3><p>{avatarBusy?'Uploading photo…':user.email}</p></div></article><form className="steel-card profile-form" onSubmit={saveAccount}><label><span>Name</span><input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></label><label><span>Email</span><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required/></label><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save profile'}</button></form><article className="settings-security-card"><span className="settings-security-icon"><Watch size={22}/></span><div><span className="eyebrow">HEALTH & WATCH SYNC</span><h3>Step integrations planned</h3><p>Steel is prepared for daily step data. Next we can connect the appropriate native bridges for Apple Health, Android Health Connect/Google Fit-compatible apps, Samsung Health and supported watch ecosystems.</p></div></article><div className="health-provider-grid"><div className="health-provider"><strong>Apple Health</strong><span>iPhone + Apple Watch</span><small>Planned</small></div><div className="health-provider"><strong>Health Connect</strong><span>Android + compatible watches</span><small>Planned</small></div><div className="health-provider"><strong>Samsung Health</strong><span>Galaxy Watch ecosystem</span><small>Planned</small></div></div><article className="settings-security-card"><span className="settings-security-icon"><ShieldCheck size={22}/></span><div><span className="eyebrow">YOUR DATA</span><h3>Private by default</h3><p>Workout, weight, profile and step records remain scoped to your authenticated account.</p></div></article><section className="settings-support-card"><div className="section-heading"><div><span className="eyebrow">NEED A HAND?</span><h3>Support</h3></div></div><div className="settings-support-list"><button type="button" onClick={()=>setMessage('Help & Support will be available here soon.')}><span><strong>Help &amp; Support</strong><small>Get help using Steel</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>setMessage('About Steel will be available here soon.')}><span><strong>About Steel</strong><small>Learn more about the app</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>setMessage('Feedback will be available here soon.')}><span><strong>Send feedback</strong><small>Tell us how Steel can improve</small></span><ChevronRight size={17}/></button></div></section><button className="signout-button" onClick={onSignOut}><LogOut size={18}/> Sign out of Project Steel</button></div>}
    </main>
    <nav className="v2-bottom-nav" aria-label="Project Steel navigation">{tabs.map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
    <nav className="v4-desktop-nav" aria-label="Project Steel desktop navigation"><div className="v4-desktop-brand"><div className="brand-emblem">S</div><strong>PROJECT STEEL</strong></div>{tabs.filter(({id})=>id!=='Train').map(({id,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={20}/><span>{id}</span></button>)}<div className="v4-desktop-support"><span className="eyebrow">SUPPORT</span><button onClick={openSettings}>Help &amp; Support <ChevronRight size={15}/></button><button onClick={openSettings}>About Steel <ChevronRight size={15}/></button></div></nav>
  </div>
}
