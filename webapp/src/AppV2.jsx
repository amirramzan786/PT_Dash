import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Home,
  LineChart,
  LogOut,
  Mail,
  Play,
  Plus,
  RotateCcw,
  Salad,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserRound,
} from 'lucide-react'
import {
  getDashboardStats,
  getRecentSessions,
  getWeightHistory,
  loadWorkouts,
  saveWeight,
  saveWorkoutSession,
} from './lib/steelApi'
import './app-v2.css'

const tabs = [
  { id: 'Home', icon: Home },
  { id: 'Plan', icon: Target },
  { id: 'Train', icon: Dumbbell },
  { id: 'Nutrition', icon: Salad },
  { id: 'Progress', icon: LineChart },
]

function makeDraft(workout) {
  return {
    workoutId: workout.id,
    step: 0,
    removedExercises: [],
    sets: Object.fromEntries(
      workout.exercises.map((exercise) => [
        exercise.id,
        Array.from({ length: exercise.sets }, (_, index) => ({
          setNo: index + 1,
          weight: 0,
          reps: 10,
          complete: false,
          removed: false,
        })),
      ]),
    ),
    cardio: { complete: true, minutes: 7, incline: 6, rpe: 6 },
  }
}

function formatDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function MiniWeightChart({ data }) {
  if (!data.length) return <div className="empty-chart">Log your first weight to start the trend.</div>
  const values = data.map((item) => Number(item.weight_lb))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const points = values.map((value, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100
    const y = 88 - ((value - min) / range) * 68
    return `${x},${y}`
  }).join(' ')
  return (
    <svg className="weight-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Body weight trend">
      <defs>
        <linearGradient id="steelFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d9ad55" stopOpacity=".3" />
          <stop offset="100%" stopColor="#d9ad55" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline className="chart-area" points={`0,100 ${points} 100,100`} />
      <polyline className="chart-line" points={points} />
      {values.map((value, index) => {
        const [x, y] = points.split(' ')[index].split(',')
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="2.2" className="chart-dot" />
      })}
    </svg>
  )
}

export default function AppV2({ user, onSignOut }) {
  const [tab, setTab] = useState('Home')
  const [workouts, setWorkouts] = useState([])
  const [stats, setStats] = useState({ latestWeightLb: null, sessionCount: 0, latestSession: null })
  const [weightHistory, setWeightHistory] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [weightInput, setWeightInput] = useState('')

  async function refreshCloud() {
    const [programme, dashboard, weights, sessions] = await Promise.all([
      loadWorkouts(user.id),
      getDashboardStats(user.id),
      getWeightHistory(user.id, 30),
      getRecentSessions(user.id, 8),
    ])
    setWorkouts(programme)
    setStats(dashboard)
    setWeightHistory(weights)
    setRecentSessions(sessions)
    if (!selectedWorkoutId && programme[0]) setSelectedWorkoutId(programme[0].id)
    return programme
  }

  useEffect(() => {
    let active = true
    setBusy(true)
    refreshCloud()
      .catch((error) => active && setMessage(error.message || 'Unable to load Steel data.'))
      .finally(() => active && setBusy(false))
    return () => { active = false }
  }, [user.id])

  const selectedWorkout = useMemo(
    () => workouts.find((workout) => workout.id === selectedWorkoutId) ?? workouts[0] ?? null,
    [workouts, selectedWorkoutId],
  )

  const activeExercises = selectedWorkout && draft
    ? selectedWorkout.exercises.filter((exercise) => !draft.removedExercises.includes(exercise.id))
    : []
  const atFinisher = Boolean(draft && draft.step >= activeExercises.length)
  const currentExercise = draft && !atFinisher ? activeExercises[draft.step] : null

  function openWorkout(workout) {
    setSelectedWorkoutId(workout.id)
    setDraft(makeDraft(workout))
    setMessage('')
    setTab('Train')
  }

  function changeWorkout(id) {
    const workout = workouts.find((item) => item.id === id)
    if (!workout) return
    setSelectedWorkoutId(id)
    setDraft(makeDraft(workout))
  }

  function updateSet(exerciseId, setNo, patch) {
    setDraft((current) => ({
      ...current,
      sets: {
        ...current.sets,
        [exerciseId]: current.sets[exerciseId].map((set) => set.setNo === setNo ? { ...set, ...patch } : set),
      },
    }))
  }

  function removeExercise(exerciseId) {
    setDraft((current) => {
      const removedExercises = [...new Set([...current.removedExercises, exerciseId])]
      const remaining = selectedWorkout.exercises.filter((exercise) => !removedExercises.includes(exercise.id))
      return { ...current, removedExercises, step: Math.min(current.step, remaining.length) }
    })
  }

  function restoreExercise(exerciseId) {
    setDraft((current) => ({ ...current, removedExercises: current.removedExercises.filter((id) => id !== exerciseId) }))
  }

  function moveStep(nextStep) {
    setDraft((current) => ({ ...current, step: Math.max(0, Math.min(nextStep, activeExercises.length)) }))
  }

  const totalCompleted = selectedWorkout && draft
    ? selectedWorkout.exercises.reduce((total, exercise) => total + (draft.sets[exercise.id] ?? []).filter((set) => set.complete && !set.removed).length, 0)
    : 0

  async function finishSession() {
    if (!selectedWorkout || !draft || totalCompleted === 0) return
    setSaving(true)
    setMessage('')
    try {
      await saveWorkoutSession({ userId: user.id, workout: selectedWorkout, draft })
      await refreshCloud()
      setDraft(makeDraft(selectedWorkout))
      setTab('Home')
      setMessage(`Session saved — ${totalCompleted} working sets logged.`)
    } catch (error) {
      setMessage(error.message || 'Unable to save workout.')
    } finally {
      setSaving(false)
    }
  }

  async function submitWeight(event) {
    event.preventDefault()
    const weight = Number(weightInput)
    if (!Number.isFinite(weight) || weight <= 0) return
    setSaving(true)
    try {
      await saveWeight(user.id, new Date().toISOString().slice(0, 10), weight)
      await refreshCloud()
      setWeightInput('')
      setMessage(`Weight saved: ${weight.toFixed(1)} lb.`)
    } catch (error) {
      setMessage(error.message || 'Unable to save weight.')
    } finally {
      setSaving(false)
    }
  }

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Account'
  const accountName = user.user_metadata?.full_name || firstName
  const latestWeight = stats.latestWeightLb ? Number(stats.latestWeightLb) : null
  const previousWeight = weightHistory.length > 1 ? Number(weightHistory.at(-2).weight_lb) : null
  const weightDelta = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null

  if (busy) {
    return <div className="v2-loading"><div className="steel-emblem">PS</div><span>Loading your Steel programme…</span></div>
  }

  return (
    <div className="steel-app">
      <main className="steel-screen">
        <header className="v2-topbar">
          <div className="brand-lockup">
            <div className="brand-emblem">PS</div>
            <div><div className="eyebrow">PERSONAL TRAINING SYSTEM</div><h1>PROJECT <span>STEEL</span></h1></div>
          </div>
          <button className={`account-button ${tab === 'Settings' ? 'active' : ''}`} onClick={() => setTab('Settings')} aria-label="Open account settings">
            <span className="account-avatar"><UserRound size={17} /></span>
            <span className="account-copy"><strong>{accountName}</strong><small>Account</small></span>
            <ChevronRight size={15} />
          </button>
        </header>

        {message && <div className="toast-note">{message}</div>}

        {tab === 'Home' && (
          <div className="page-stack">
            <section className="welcome-row">
              <div><div className="eyebrow">WELCOME BACK</div><h2>{firstName}, let’s build.</h2></div>
              <div className="streak-orb"><Flame size={22} /><span>{stats.sessionCount}</span><small>sessions</small></div>
            </section>

            <section className="hero-panel">
              <div className="hero-copy">
                <span className="gold-kicker">TODAY’S FOCUS</span>
                <h2>Build strength.<br />Build consistency.</h2>
                <p>One focused session at a time. Your plan is ready when you are.</p>
                {workouts[0] && <button className="gold-button" onClick={() => openWorkout(workouts[0])}><Play size={17} /> Start today’s workout</button>}
              </div>
              <div className="hero-art"><Dumbbell size={64} /></div>
            </section>

            <section className="dashboard-grid">
              <article className="steel-card weight-summary-card">
                <div className="card-title-row"><span className="card-icon"><Scale size={17} /></span><span className="eyebrow">BODY WEIGHT</span></div>
                <strong className="big-metric">{latestWeight ? `${latestWeight.toFixed(1)} lb` : '— lb'}</strong>
                <div className={`delta ${weightDelta !== null && weightDelta <= 0 ? 'good' : ''}`}>
                  {weightDelta === null ? 'Log a check-in to start tracking' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} lb vs previous`}
                </div>
                <MiniWeightChart data={weightHistory.slice(-8)} />
                <button className="mini-link" onClick={() => setTab('Progress')}>View progress <ChevronRight size={14} /></button>
              </article>

              <article className="steel-card consistency-card">
                <div className="card-title-row"><span className="card-icon"><Trophy size={17} /></span><span className="eyebrow">CONSISTENCY</span></div>
                <strong className="big-metric">{stats.sessionCount}</strong>
                <span className="metric-label">workouts logged</span>
                <div className="ring-wrap"><div className="simple-ring"><span>{Math.min(stats.sessionCount * 10, 100)}%</span></div><p>Every completed session adds to your base.</p></div>
              </article>
            </section>

            <section>
              <div className="section-heading"><div><span className="eyebrow">YOUR PROGRAMME</span><h3>Choose a workout</h3></div><button className="text-link" onClick={() => setTab('Plan')}>View plan</button></div>
              <div className="workout-tile-stack">
                {workouts.map((workout, index) => (
                  <button className="workout-tile" key={workout.id} onClick={() => openWorkout(workout)}>
                    <div className={`tile-art tile-art-${index + 1}`}><Dumbbell size={30} /></div>
                    <div className="tile-copy"><span className="eyebrow">WORKOUT {index + 1}</span><strong>{workout.name}</strong><small>{workout.exercises.length} exercises · {workout.duration}</small></div>
                    <span className="tile-arrow"><ChevronRight size={19} /></span>
                  </button>
                ))}
              </div>
            </section>

            <section className="steel-card quick-strip">
              <button type="button" onClick={() => setTab('Progress')}><Scale size={18} /><span>Log weight</span></button>
              <button type="button" onClick={() => setTab('Nutrition')}><Salad size={18} /><span>Nutrition</span></button>
              <button type="button" onClick={() => setTab('Progress')}><BarChart3 size={18} /><span>Progress</span></button>
            </section>
          </div>
        )}

        {tab === 'Plan' && (
          <div className="page-stack">
            <section className="page-intro"><span className="eyebrow">YOUR PROGRAMME</span><h2>Training plan</h2><p>Three focused sessions, built around machines with a few free-weight movements.</p></section>
            {workouts.map((workout, index) => (
              <article className="plan-block" key={workout.id}>
                <div className="plan-image"><div className="plan-image-icon"><Dumbbell size={34} /></div><span>WORKOUT {index + 1}</span></div>
                <div className="plan-content">
                  <div className="plan-title-row"><div><h3>{workout.name}</h3><p>{workout.exercises.length} exercises · {workout.duration}</p></div><button className="circle-button" onClick={() => openWorkout(workout)}><ArrowRight size={18} /></button></div>
                  <div className="compact-exercise-list">
                    {workout.exercises.map((exercise, exerciseIndex) => (
                      <div className="compact-exercise" key={exercise.id}><span>{exerciseIndex + 1}</span><div><strong>{exercise.name}</strong><small>{exercise.equipment} · {exercise.sets} × {exercise.reps}</small></div></div>
                    ))}
                  </div>
                  <div className="finisher-badge"><Flame size={15} /> {workout.finisher}</div>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === 'Train' && (
          <div className="page-stack training-page">
            {!selectedWorkout || !draft ? (
              <section className="empty-state"><Dumbbell size={34} /><h2>Choose a workout</h2><p>Start from Home or Plan to begin a guided session.</p>{workouts[0] && <button className="gold-button" onClick={() => openWorkout(workouts[0])}>Start workout</button>}</section>
            ) : (
              <>
                <section className="train-top">
                  <div><span className="eyebrow">ACTIVE WORKOUT</span><h2>{selectedWorkout.name}</h2></div>
                  <select value={selectedWorkout.id} onChange={(e) => changeWorkout(e.target.value)}>{workouts.map((workout) => <option key={workout.id} value={workout.id}>{workout.name}</option>)}</select>
                </section>
                <div className="train-progress-copy"><span>{atFinisher ? 'Final step' : `Exercise ${draft.step + 1} of ${activeExercises.length}`}</span><span>{Math.round(((draft.step + 1) / (activeExercises.length + 1)) * 100)}%</span></div>
                <div className="train-progress"><span style={{ width: `${Math.round(((draft.step + 1) / (activeExercises.length + 1)) * 100)}%` }} /></div>

                {!atFinisher && currentExercise && (
                  <>
                    <article className="exercise-focus-card">
                      <div className="exercise-visual"><Dumbbell size={48} /></div>
                      <div className="exercise-focus-copy"><span className="eyebrow">CURRENT EXERCISE</span><h2>{currentExercise.name}</h2><p>{currentExercise.equipment} · {currentExercise.sets} sets × {currentExercise.reps}</p></div>
                    </article>
                    <div className="set-list-v2">
                      {(draft.sets[currentExercise.id] ?? []).map((set) => (
                        <article className={`set-row-v2 ${set.complete ? 'complete' : ''} ${set.removed ? 'removed' : ''}`} key={set.setNo}>
                          <div className="set-number">{set.setNo}</div>
                          {!set.removed ? (
                            <>
                              <label><span>KG</span><input type="number" min="0" step="2.5" value={set.weight} onChange={(e) => updateSet(currentExercise.id, set.setNo, { weight: Number(e.target.value) || 0 })} /></label>
                              <label><span>REPS</span><input type="number" min="1" max="50" value={set.reps} onChange={(e) => updateSet(currentExercise.id, set.setNo, { reps: Math.max(1, Number(e.target.value) || 1) })} /></label>
                              <div className="set-actions-v2">
                                <button className={set.complete ? 'done-button done' : 'done-button'} onClick={() => updateSet(currentExercise.id, set.setNo, { complete: !set.complete })}><Check size={16} /> {set.complete ? 'Done' : 'Complete'}</button>
                                <button className="remove-button" onClick={() => updateSet(currentExercise.id, set.setNo, { removed: true, complete: false })}><Trash2 size={15} /> Remove</button>
                              </div>
                            </>
                          ) : (
                            <div className="removed-copy"><span>Removed from this session</span><button onClick={() => updateSet(currentExercise.id, set.setNo, { removed: false })}><RotateCcw size={15} /> Restore</button></div>
                          )}
                        </article>
                      ))}
                    </div>
                    <details className="options-panel"><summary>Exercise options</summary><p>Changes here only affect this session.</p><button className="danger-link" onClick={() => removeExercise(currentExercise.id)}><Trash2 size={16} /> Remove exercise from session</button></details>
                    <div className="train-nav-row"><button disabled={draft.step === 0} onClick={() => moveStep(draft.step - 1)}><ArrowLeft size={17} /> Previous</button><button className="gold-button" onClick={() => moveStep(draft.step + 1)}>{draft.step === activeExercises.length - 1 ? 'Go to finisher' : 'Next exercise'} <ArrowRight size={17} /></button></div>
                    <div className="jump-row"><span>Jump to</span><select value={draft.step} onChange={(e) => moveStep(Number(e.target.value))}>{activeExercises.map((exercise, index) => <option key={exercise.id} value={index}>{index + 1}. {exercise.name}</option>)}<option value={activeExercises.length}>Finisher + save</option></select></div>
                  </>
                )}

                {atFinisher && (
                  <>
                    <article className="finisher-panel"><div className="finisher-symbol"><Flame size={24} /></div><div><span className="eyebrow">FINISH STRONG</span><h2>Incline cardio finisher</h2><p>Medium-intensity treadmill walk.</p></div><label className="switch-line"><input type="checkbox" checked={draft.cardio.complete} onChange={(e) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, complete: e.target.checked } }))} /><span>Doing finisher</span></label>{draft.cardio.complete && <div className="cardio-inputs"><label><span>MIN</span><input type="number" min="5" max="10" value={draft.cardio.minutes} onChange={(e) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, minutes: Number(e.target.value) || 5 } }))} /></label><label><span>INCLINE %</span><input type="number" min="1" max="15" step=".5" value={draft.cardio.incline} onChange={(e) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, incline: Number(e.target.value) || 1 } }))} /></label><label><span>RPE</span><input type="number" min="1" max="10" step=".5" value={draft.cardio.rpe} onChange={(e) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, rpe: Number(e.target.value) || 1 } }))} /></label></div>}</article>
                    <article className="session-summary-v2"><div className="summary-hero"><Check size={20} /><div><span className="eyebrow">SESSION SUMMARY</span><strong>{totalCompleted} working sets</strong></div></div>{selectedWorkout.exercises.map((exercise) => { const removed = draft.removedExercises.includes(exercise.id); const sets = draft.sets[exercise.id] ?? []; const done = sets.filter((set) => set.complete && !set.removed).length; const active = sets.filter((set) => !set.removed).length; return <div className="summary-row-v2" key={exercise.id}><span>{exercise.name}</span><strong>{removed ? 'Removed' : `${done}/${active}`}</strong></div> })}</article>
                    {draft.removedExercises.length > 0 && <details className="options-panel"><summary>Restore removed exercises</summary>{draft.removedExercises.map((exerciseId) => { const exercise = selectedWorkout.exercises.find((item) => item.id === exerciseId); return exercise ? <button className="restore-exercise" key={exerciseId} onClick={() => restoreExercise(exerciseId)}><RotateCcw size={14} /> {exercise.name}</button> : null })}</details>}
                    <div className="train-nav-row"><button onClick={() => moveStep(Math.max(activeExercises.length - 1, 0))}><ArrowLeft size={17} /> Back</button><button className="gold-button" disabled={totalCompleted === 0 || saving} onClick={finishSession}><Check size={17} /> {saving ? 'Saving…' : 'Save session'}</button></div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'Nutrition' && (
          <div className="page-stack">
            <section className="page-intro"><span className="eyebrow">FUEL YOUR GOAL</span><h2>Nutrition</h2><p>Simple targets and meals without turning Steel into a calorie-counting spreadsheet.</p></section>
            <article className="nutrition-hero"><div className="macro-orb"><span>—</span><small>kcal</small></div><div><span className="eyebrow">DAILY TARGET</span><h3>Nutrition setup is next</h3><p>Calories, protein, meal templates and a shopping-friendly plan will live here.</p></div></article>
            <div className="nutrition-placeholder-grid"><div className="steel-card"><Salad size={21} /><strong>Meals</strong><span>Breakfast · Lunch · Dinner · Snacks</span></div><div className="steel-card"><Target size={21} /><strong>Targets</strong><span>Calories · Protein · Adherence</span></div></div>
          </div>
        )}

        {tab === 'Progress' && (
          <div className="page-stack">
            <section className="page-intro"><span className="eyebrow">TRACK WHAT MATTERS</span><h2>Progress</h2><p>Body weight in lbs and training consistency in one clean view.</p></section>
            <article className="progress-hero-card"><div className="progress-metric"><span className="eyebrow">CURRENT WEIGHT</span><strong>{latestWeight ? `${latestWeight.toFixed(1)} lb` : '— lb'}</strong><small>{weightDelta === null ? 'No comparison yet' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} lb vs previous`}</small></div><MiniWeightChart data={weightHistory} /></article>
            <form className="weight-entry-card" onSubmit={submitWeight}><div><span className="eyebrow">QUICK CHECK-IN</span><h3>Log today’s weight</h3></div><div className="weight-entry-row"><label><input type="number" min="60" max="700" step=".1" placeholder={latestWeight ? latestWeight.toFixed(1) : 'Weight'} value={weightInput} onChange={(e) => setWeightInput(e.target.value)} /><span>lb</span></label><button className="gold-button" type="submit" disabled={saving || !weightInput}><Plus size={17} /> Save</button></div></form>
            <section className="steel-card"><div className="section-heading"><div><span className="eyebrow">RECENT CHECK-INS</span><h3>Weight history</h3></div><Scale size={20} /></div>{weightHistory.length ? [...weightHistory].reverse().slice(0, 6).map((row, index, arr) => { const previous = arr[index + 1] ? Number(arr[index + 1].weight_lb) : null; const delta = previous === null ? null : Number(row.weight_lb) - previous; return <div className="history-row" key={row.id}><span>{formatDate(row.checkin_date)}</span><strong>{Number(row.weight_lb).toFixed(1)} lb</strong><small className={delta !== null && delta <= 0 ? 'good' : ''}>{delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}</small></div> }) : <p className="muted-copy">No check-ins yet.</p>}</section>
            <section className="steel-card"><div className="section-heading"><div><span className="eyebrow">TRAINING HISTORY</span><h3>Recent sessions</h3></div><Dumbbell size={20} /></div>{recentSessions.length ? recentSessions.map((session) => <div className="history-row session-history" key={session.id}><div><strong>{session.workout_name}</strong><span>{formatDate(session.session_date)}</span></div><small>{session.duration_min || 45} min</small></div>) : <p className="muted-copy">Your completed sessions will appear here.</p>}</section>
            <article className="goal-card"><div className="goal-icon"><Sparkles size={20} /></div><div><span className="eyebrow">YOUR GOAL</span><h3>Lose fat. Build muscle.</h3><p>Steel will connect body-weight trend, training progress and nutrition here as the app develops.</p></div></article>
          </div>
        )}

        {tab === 'Settings' && (
          <div className="page-stack settings-page">
            <section className="page-intro"><span className="eyebrow">ACCOUNT</span><h2>Settings</h2><p>Your Project Steel account, privacy and app details.</p></section>

            <article className="settings-profile-card">
              <div className="settings-avatar"><UserRound size={30} /></div>
              <div><span className="eyebrow">SIGNED IN AS</span><h3>{accountName}</h3><p>{user.email}</p></div>
            </article>

            <section className="steel-card settings-list">
              <div className="settings-row"><span className="settings-row-icon"><UserRound size={18} /></span><div><small>Name</small><strong>{accountName}</strong></div></div>
              <div className="settings-row"><span className="settings-row-icon"><Mail size={18} /></span><div><small>Email</small><strong>{user.email}</strong></div></div>
              <div className="settings-row"><span className="settings-row-icon"><Target size={18} /></span><div><small>Primary goal</small><strong>Lose fat and gain muscle</strong></div></div>
              <div className="settings-row"><span className="settings-row-icon"><Settings size={18} /></span><div><small>Member since</small><strong>{formatDate(user.created_at)}</strong></div></div>
            </section>

            <article className="settings-security-card">
              <span className="settings-security-icon"><ShieldCheck size={22} /></span>
              <div><span className="eyebrow">YOUR DATA</span><h3>Private by default</h3><p>Your workouts, weight and future nutrition data are protected by Supabase authentication and Row Level Security.</p></div>
            </article>

            <button className="signout-button" type="button" onClick={onSignOut}><LogOut size={18} /> Sign out of Project Steel</button>
          </div>
        )}
      </main>

      <nav className="v2-bottom-nav" aria-label="Project Steel navigation">
        {tabs.map(({ id, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={20} /><span>{id}</span></button>)}
      </nav>
    </div>
  )
}
