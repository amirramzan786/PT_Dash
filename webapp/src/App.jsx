import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Footprints,
  Dumbbell,
  Flame,
  Home,
  Info,
  LineChart,
  MessageSquare,
  Settings,
  HelpCircle,
  ListChecks,
  RotateCcw,
  Salad,
  Scale,
  SkipForward,
  Target,
  Trash2,
} from 'lucide-react'
import { workouts } from './workoutData'

const tabs = [
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'Plan', label: 'Workouts', icon: Dumbbell },
  { id: 'Progress', label: 'Progress', icon: LineChart },
  { id: 'Train', label: 'Train', icon: Target },
  { id: 'Settings', label: 'Settings', icon: Settings },
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

function App() {
  const [tab, setTab] = useState('Home')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(workouts[0].id)
  const [draft, setDraft] = useState(() => makeDraft(workouts[0]))
  const [savedSessions, setSavedSessions] = useState([])
  const [progressOpen, setProgressOpen] = useState(false)

  const selectedWorkout = useMemo(
    () => workouts.find((workout) => workout.id === selectedWorkoutId) ?? workouts[0],
    [selectedWorkoutId],
  )

  const activeExercises = selectedWorkout.exercises.filter(
    (exercise) => !draft.removedExercises.includes(exercise.id),
  )
  const atFinisher = draft.step >= activeExercises.length
  const currentExercise = atFinisher ? null : activeExercises[draft.step]

  function openWorkout(workout) {
    setSelectedWorkoutId(workout.id)
    setDraft(makeDraft(workout))
    setTab('Train')
  }

  function changeWorkout(id) {
    const workout = workouts.find((item) => item.id === id) ?? workouts[0]
    setSelectedWorkoutId(workout.id)
    setDraft(makeDraft(workout))
  }

  function updateSet(exerciseId, setNo, patch) {
    setDraft((current) => ({
      ...current,
      sets: {
        ...current.sets,
        [exerciseId]: current.sets[exerciseId].map((set) =>
          set.setNo === setNo ? { ...set, ...patch } : set,
        ),
      },
    }))
  }

  function removeExercise(exerciseId) {
    setDraft((current) => {
      const removedExercises = [...new Set([...current.removedExercises, exerciseId])]
      const remaining = selectedWorkout.exercises.filter((exercise) => !removedExercises.includes(exercise.id))
      return {
        ...current,
        removedExercises,
        step: Math.min(current.step, remaining.length),
      }
    })
  }

  function restoreExercise(exerciseId) {
    setDraft((current) => ({
      ...current,
      removedExercises: current.removedExercises.filter((id) => id !== exerciseId),
    }))
  }

  function moveStep(nextStep) {
    const maxStep = activeExercises.length
    setDraft((current) => ({ ...current, step: Math.max(0, Math.min(nextStep, maxStep)) }))
  }

  function saveSession() {
    const completedSets = selectedWorkout.exercises.reduce((total, exercise) => {
      if (draft.removedExercises.includes(exercise.id)) return total
      return total + (draft.sets[exercise.id] ?? []).filter((set) => set.complete && !set.removed).length
    }, 0)

    if (!completedSets) return

    setSavedSessions((sessions) => [
      {
        id: Date.now(),
        workout: selectedWorkout.name,
        completedSets,
        cardioMinutes: draft.cardio.complete ? draft.cardio.minutes : 0,
      },
      ...sessions,
    ])
    setDraft(makeDraft(selectedWorkout))
    setTab('Home')
  }

  const totalCompleted = selectedWorkout.exercises.reduce((total, exercise) => {
    return total + (draft.sets[exercise.id] ?? []).filter((set) => set.complete && !set.removed).length
  }, 0)

  return (
    <div className="app-shell">
      <main className="screen">
        <header className="topbar">
          <div>
            <div className="eyebrow">DISCIPLINE · CONSISTENCY · STRENGTH</div>
            <h1>STEEL</h1>
          </div>
          <button className="profile-button" aria-label="Open settings" onClick={() => setTab('Settings')}>A <ChevronDown size={15} /></button>
        </header>

        {tab === 'Home' && (
          <>
            <section className="hero-card home-hero">
              <div className="hero-artwork" aria-hidden="true"><div className="hero-figure" /></div>
              <div>
                <div className="muted">WELCOME BACK,</div>
                <h2>Amir</h2>
                <p>You’ve got this. Let’s build something strong today.</p>
              </div>
            </section>

            <section className="metric-grid welcome-metrics">
              <article className="card metric-card"><Dumbbell size={18} /><div className="muted">WORKOUTS</div><strong>12</strong><small>This month</small></article>
              <article className="card metric-card"><Flame size={18} /><div className="muted">STREAK</div><strong>7</strong><small>Days</small></article>
              <article className="card metric-card"><Scale size={18} /><div className="muted">VOLUME</div><strong>4,580</strong><small>kg lifted</small></article>
              <article className="card metric-card"><Check size={18} /><div className="muted">SESSIONS</div><strong>{Math.max(28, savedSessions.length)}</strong><small>Completed</small></article>
            </section>

            <section className="quick-actions-section">
              <div className="section-head"><h3>Quick actions</h3></div>
              <div className="quick-actions">
                <button className="quick-action" onClick={() => openWorkout(workouts[0])}><CirclePlus /><span>Start<br />workout</span></button>
                <button className="quick-action" onClick={() => openWorkout(workouts[1])}><Dumbbell /><span>Push<br />workout</span></button>
                <button className="quick-action" onClick={() => setTab('Train')}><Flame /><span>Cardio<br />session</span></button>
                <button className="quick-action" onClick={() => setProgressOpen(true)}><ListChecks /><span>View<br />progress</span></button>
              </div>
            </section>

            <section className="card daily-checkin">
              <div className="daily-checkin-item"><Footprints size={20} /><div><span>Today’s steps</span><strong>6,240</strong></div></div>
              <div className="daily-checkin-item"><Scale size={20} /><div><span>Weight</span><strong>— <small>lb</small></strong></div></div>
            </section>

            <section>
              <div className="section-head"><h3>Upcoming workouts</h3><button className="text-button" onClick={() => setTab('Plan')}>View all</button></div>
              <div className="upcoming-list">
                {workouts.map((workout, index) => (
                  <button className="card upcoming-card" key={workout.id} onClick={() => openWorkout(workout)}>
                    <div className={`workout-art ${workout.artClass}`}><div className="art-silhouette" /></div>
                    <div className="upcoming-copy"><strong>{workout.shortName}</strong><span>{workout.focus}</span><small>{index === 0 ? 'Tomorrow · 10:00 AM' : index === 1 ? 'Thu, 4 Sept · 6:00 PM' : 'Sat, 6 Sept · 11:00 AM'}</small></div>
                    <span className="exercise-count">{workout.exercises.length} exercises</span><ChevronRight className="upcoming-chevron" size={20} />
                  </button>
                ))}
              </div>
            </section>

            <section className="progress-section">
              <button className="progress-heading" onClick={() => setProgressOpen((open) => !open)} aria-expanded={progressOpen}><span><h3>Progress</h3><small>Relative metrics</small></span><ChevronDown className={progressOpen ? 'rotated' : ''} /></button>
              {progressOpen && <div className="card progress-card"><div className="progress-card-head"><strong>This week</strong><span>4 workouts</span></div><div className="bar-chart">{[1, 2, 3, 1.5, 2.5, 1, 2].map((height, index) => <div className="bar-column" key={index}><span style={{ height: `${height * 24}px` }} /><small>{['M','T','W','T','F','S','S'][index]}</small></div>)}</div><div className="relative-metrics"><div><span>Weekly goal</span><strong>4 / 5</strong></div><div><span>Volume change</span><strong>+12%</strong></div><div><span>Consistency</span><strong>86%</strong></div></div></div>}
            </section>

            {savedSessions[0] && (
              <section className="card recent-card">
                <div className="muted">LATEST SESSION</div>
                <h3>{savedSessions[0].workout}</h3>
                <p>{savedSessions[0].completedSets} working sets · {savedSessions[0].cardioMinutes} min incline</p>
              </section>
            )}
          </>
        )}

        {tab === 'Plan' && (
          <section>
            <div className="page-heading">
              <div className="muted">YOUR PROGRAMME</div>
              <h2>Training plan</h2>
              <p>Three focused sessions. Six lifts each. Incline finisher after every workout.</p>
            </div>
            <div className="stack">
              {workouts.map((workout, index) => (
                <article className="card plan-card" key={workout.id}>
                  <div className="plan-topline">
                    <div>
                      <div className="muted">WORKOUT {index + 1}</div>
                      <h3>{workout.name}</h3>
                    </div>
                    <button className="icon-button" aria-label={`Start ${workout.name}`} onClick={() => openWorkout(workout)}>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  <div className="exercise-list">
                    {workout.exercises.map((exercise, exerciseIndex) => (
                      <div className="exercise-line" key={exercise.id}>
                        <span className="exercise-number">{exerciseIndex + 1}</span>
                        <div>
                          <strong>{exercise.name}</strong>
                          <small>{exercise.equipment} · {exercise.sets} × {exercise.reps}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="finisher-strip">+ {workout.finisher}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'Train' && (
          <section>
            <div className="train-header">
              <div>
                <div className="muted">ACTIVE SESSION</div>
                <h2>{selectedWorkout.name}</h2>
              </div>
              <select value={selectedWorkoutId} onChange={(event) => changeWorkout(event.target.value)} aria-label="Workout">
                {workouts.map((workout) => <option value={workout.id} key={workout.id}>{workout.name}</option>)}
              </select>
            </div>

            <div className="session-progress">
              <div className="progress-copy">
                <span>{atFinisher ? 'Finisher' : `Exercise ${draft.step + 1} of ${activeExercises.length}`}</span>
                <span>{Math.round(((draft.step + 1) / (activeExercises.length + 1)) * 100)}%</span>
              </div>
              <div className="progress-track"><span style={{ width: `${Math.round(((draft.step + 1) / (activeExercises.length + 1)) * 100)}%` }} /></div>
            </div>

            {!atFinisher && currentExercise && (
              <>
                <article className="card exercise-hero">
                  <div className="muted">CURRENT EXERCISE</div>
                  <h2>{currentExercise.name}</h2>
                  <p>{currentExercise.equipment} · target {currentExercise.sets} sets × {currentExercise.reps}</p>
                </article>

                <div className="set-stack">
                  {(draft.sets[currentExercise.id] ?? []).map((set) => (
                    <article className={`card set-card ${set.complete ? 'is-complete' : ''} ${set.removed ? 'is-removed' : ''}`} key={set.setNo}>
                      <div className="set-heading">
                        <strong>Set {set.setNo}</strong>
                        {set.complete && !set.removed && <span className="status-pill"><Check size={14} /> Complete</span>}
                        {set.removed && <span className="status-pill muted-pill">Removed</span>}
                      </div>

                      {!set.removed && (
                        <div className="set-inputs">
                          <label>
                            <span>Weight (kg)</span>
                            <input
                              type="number"
                              min="0"
                              step="2.5"
                              value={set.weight}
                              onChange={(event) => updateSet(currentExercise.id, set.setNo, { weight: Number(event.target.value) || 0 })}
                            />
                          </label>
                          <label>
                            <span>Reps</span>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={set.reps}
                              onChange={(event) => updateSet(currentExercise.id, set.setNo, { reps: Math.max(1, Number(event.target.value) || 1) })}
                            />
                          </label>
                        </div>
                      )}

                      <div className="inline-actions">
                        {!set.removed ? (
                          <>
                            <button
                              className={set.complete ? 'compact secondary-action' : 'compact complete-action'}
                              onClick={() => updateSet(currentExercise.id, set.setNo, { complete: !set.complete })}
                            >
                              <Check size={16} /> {set.complete ? 'Completed' : 'Complete'}
                            </button>
                            <button
                              className="compact secondary-action"
                              onClick={() => updateSet(currentExercise.id, set.setNo, { removed: true, complete: false })}
                            >
                              <Trash2 size={15} /> Remove
                            </button>
                          </>
                        ) : (
                          <button className="compact secondary-action" onClick={() => updateSet(currentExercise.id, set.setNo, { removed: false })}>
                            <RotateCcw size={15} /> Restore
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <details className="exercise-options card">
                  <summary>Exercise options</summary>
                  <p>Removing an exercise only affects this session.</p>
                  <button className="danger-button" onClick={() => removeExercise(currentExercise.id)}>
                    <Trash2 size={16} /> Remove exercise from session
                  </button>
                </details>

                <div className="step-actions">
                  <button className="secondary-action" disabled={draft.step === 0} onClick={() => moveStep(draft.step - 1)}>
                    <ArrowLeft size={18} /> Previous
                  </button>
                  <button className="primary" onClick={() => moveStep(draft.step + 1)}>
                    {draft.step === activeExercises.length - 1 ? 'Finisher' : 'Next exercise'} <ArrowRight size={18} />
                  </button>
                </div>

                <div className="jump-strip">
                  <span>Jump to</span>
                  <select value={draft.step} onChange={(event) => moveStep(Number(event.target.value))}>
                    {activeExercises.map((exercise, index) => <option value={index} key={exercise.id}>{index + 1}. {exercise.name}</option>)}
                    <option value={activeExercises.length}>Finisher + save</option>
                  </select>
                </div>
              </>
            )}

            {atFinisher && (
              <>
                <article className="card finisher-card">
                  <div className="finisher-icon"><SkipForward size={20} /></div>
                  <div>
                    <div className="muted">FINAL STEP</div>
                    <h2>Incline cardio finisher</h2>
                    <p>Medium-intensity treadmill walk.</p>
                  </div>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={draft.cardio.complete}
                      onChange={(event) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, complete: event.target.checked } }))}
                    />
                    <span>Doing finisher</span>
                  </label>

                  {draft.cardio.complete && (
                    <div className="cardio-grid">
                      <label><span>Minutes</span><input type="number" min="5" max="10" value={draft.cardio.minutes} onChange={(e) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, minutes: Number(e.target.value) } }))} /></label>
                      <label><span>Incline %</span><input type="number" min="1" max="15" step="0.5" value={draft.cardio.incline} onChange={(e) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, incline: Number(e.target.value) } }))} /></label>
                      <label><span>Effort /10</span><input type="number" min="1" max="10" step="0.5" value={draft.cardio.rpe} onChange={(e) => setDraft((current) => ({ ...current, cardio: { ...current.cardio, rpe: Number(e.target.value) } }))} /></label>
                    </div>
                  )}
                </article>

                <article className="card summary-card">
                  <div className="muted">SESSION SUMMARY</div>
                  <h3>{totalCompleted} completed working sets</h3>
                  {selectedWorkout.exercises.map((exercise) => {
                    const removedExercise = draft.removedExercises.includes(exercise.id)
                    const setData = draft.sets[exercise.id] ?? []
                    const done = setData.filter((set) => set.complete && !set.removed).length
                    const active = setData.filter((set) => !set.removed).length
                    return (
                      <div className="summary-line" key={exercise.id}>
                        <span>{exercise.name}</span>
                        <strong>{removedExercise ? 'Removed' : `${done}/${active}`}</strong>
                      </div>
                    )
                  })}
                </article>

                {draft.removedExercises.length > 0 && (
                  <details className="card restore-exercises">
                    <summary>Restore removed exercises</summary>
                    {draft.removedExercises.map((exerciseId) => {
                      const exercise = selectedWorkout.exercises.find((item) => item.id === exerciseId)
                      return exercise ? (
                        <button className="secondary-action" key={exerciseId} onClick={() => restoreExercise(exerciseId)}>
                          <RotateCcw size={15} /> {exercise.name}
                        </button>
                      ) : null
                    })}
                  </details>
                )}

                <div className="step-actions">
                  <button className="secondary-action" onClick={() => moveStep(Math.max(activeExercises.length - 1, 0))}><ArrowLeft size={18} /> Back</button>
                  <button className="primary" disabled={totalCompleted === 0} onClick={saveSession}><Check size={18} /> Save session</button>
                </div>
                {totalCompleted === 0 && <p className="validation-note">Complete at least one working set before saving.</p>}
              </>
            )}
          </section>
        )}

        {tab === 'Nutrition' && (
          <section className="placeholder">
            <div className="placeholder-icon"><Salad /></div>
            <div className="muted">NEXT BUILD PHASE</div>
            <h2>Nutrition</h2>
            <p>Meal plan, calorie target, protein target and simple daily adherence are next. AI remains parked.</p>
          </section>
        )}

        {tab === 'Progress' && (
          <section className="placeholder">
            <div className="placeholder-icon"><LineChart /></div>
            <div className="muted">NEXT BUILD PHASE</div>
            <h2>Progress</h2>
            <p>Body weight in lbs, strength progression and workout history will live here once Supabase is connected.</p>
          </section>
        )}

        {tab === 'Settings' && (
          <section className="settings-page">
            <div className="page-heading"><div className="muted">ACCOUNT</div><h2>Settings</h2><p>Manage your profile and Steel preferences.</p></div>
            <div className="card profile-row"><div className="avatar">A</div><div><strong>Amir</strong><small>amir@example.com</small></div><ChevronRight /></div>
            <div className="settings-group"><div className="muted">SUPPORT</div><button className="settings-row"><HelpCircle /><span>Help & Support</span><ChevronRight /></button><button className="settings-row"><MessageSquare /><span>Send Feedback</span><ChevronRight /></button><button className="settings-row"><Info /><span>About Steel</span><ChevronRight /></button></div>
            <button className="danger-button sign-out">Sign out</button>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Project Steel navigation">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <nav className="desktop-nav" aria-label="Project Steel desktop navigation">
        <div className="desktop-profile"><div className="avatar">A</div><div><strong>Amir</strong><small>amir@example.com</small></div><ChevronRight size={18} /></div>
        {tabs.filter(({ id }) => ['Home','Plan','Progress','Settings'].includes(id)).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={22} /><span>{label}</span></button>)}
        <div className="desktop-support"><div className="muted">SUPPORT</div><button onClick={() => setTab('Settings')}><HelpCircle size={20} />Help & Support<ChevronRight size={18} /></button><button onClick={() => setTab('Settings')}><MessageSquare size={20} />Send Feedback<ChevronRight size={18} /></button><button onClick={() => setTab('Settings')}><Info size={20} />About Steel<ChevronRight size={18} /></button></div>
      </nav>
    </div>
  )
}

export default App
