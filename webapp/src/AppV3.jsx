import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, Camera, Check, ChevronDown, ChevronRight, Dumbbell, ExternalLink, Flame,
  Footprints, HelpCircle, Home, Info, LineChart, LogOut, MessageSquare, MoreHorizontal, Play, RotateCcw, Salad, Save, Scale, Search, Settings,
  ShieldCheck, Target, Trash2, UserRound, Watch, ListChecks, ClipboardCheck,
} from 'lucide-react'
import {
  changePassword, deleteMealLog, getDashboardStats, getLatestWeeklyCheckin, getMealLogs, getProfile, getRecentSessions, getTodaySteps, getStepHistory, getWeightHistory, getWeeklyCheckinHistory,
  getNutritionPlan, getWeeklyActivitySummary, loadExerciseCatalog, loadWorkouts, saveCustomWorkout, saveMealLog, saveMealPlanItem, saveProfile, saveWeight, saveWeeklyCheckin as saveWeeklyCheckinRecord, saveWorkoutSession, updateAccount, updateCustomWorkout, uploadAvatar, uploadCheckinMedia,
} from './lib/steelApi'
import './app-v2.css'
import './settings.css'
import './v3.css'
import SteelMark from './components/SteelMark'

const tabs = [
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'Plan', label: 'Workouts', icon: Dumbbell },
  { id: 'Train', label: 'Start workout', icon: Activity },
  { id: 'Progress', label: 'Progress', icon: LineChart },
  { id: 'Weight', label: 'Weight', icon: Scale },
  { id: 'MealPlan', label: 'Meal plan', icon: Salad },
  { id: 'Recipes', label: 'Recipes', icon: Salad },
  { id: 'Library', label: 'Exercise library', icon: ListChecks },
  { id: 'Checkin', label: 'Weekly check-in', icon: ClipboardCheck },
]

const mobileTabs = [
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'Train', label: 'Start', icon: Activity },
  { id: 'Progress', label: 'Progress', icon: LineChart },
  { id: 'MealPlan', label: 'Meal plan', icon: Salad },
]

const experienceOptions = ['Beginner', 'Intermediate', 'Advanced']
const equipmentOptions = ['Machines', 'Dumbbells', 'Barbell', 'Cables', 'Bodyweight', 'Cardio']
const dietaryOptions = ['No preference', 'High protein', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal']

function SettingsDisclosure({ id, eyebrow, title, icon: Icon, open, onToggle, children }) {
  return <section className={`settings-disclosure ${open ? 'is-open' : ''}`}><button type="button" className="settings-disclosure-trigger" onClick={onToggle} aria-expanded={open} aria-controls={id}><span className="settings-disclosure-label"><span className="settings-security-icon"><Icon size={19}/></span><span><span className="eyebrow">{eyebrow}</span><strong>{title}</strong></span></span><ChevronDown size={18} className={open ? 'rotated' : ''}/></button>{open && <div className="settings-disclosure-content" id={id}>{children}</div>}</section>
}

function makeDraft(workout) {
  return {
    step: 0,
    removedExercises: [],
    sets: Object.fromEntries(workout.exercises.map((exercise) => [exercise.id,
      Array.from({ length: exercise.sets }, (_, index) => ({ setNo: index + 1, weight: Number(exercise.startWeightKg) || 0, reps: Number.parseInt(exercise.reps, 10) || 10, complete: false, removed: false })),
    ])),
    cardio: { complete: true, minutes: 7, incline: 6, rpe: 6 },
  }
}

function formatDate(value) {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function currentWeekBounds() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
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

function ProgressPage({ stats, sessions, weights, stepHistory, totalSteps }) {
  const latestWeight = weights.length ? Number(weights.at(-1).weight_lb) : null
  const startingWeight = weights.length ? Number(weights[0].weight_lb) : null
  const weightChange = latestWeight !== null && startingWeight !== null && weights.length > 1 ? latestWeight - startingWeight : null
  const averageDuration = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + (Number(session.duration_min) || 0), 0) / sessions.length) : 0
  return <div className="page-stack progress-page"><section className="page-intro"><span className="eyebrow">PROGRESS</span><h2>Your momentum</h2><p>A clear view of consistency, training load, movement and body-weight trend.</p></section><section className="progress-stat-grid"><article className="steel-card"><Dumbbell size={19}/><span>WORKOUTS</span><strong>{stats.sessionCount}</strong><small>All time</small></article><article className="steel-card"><Flame size={19}/><span>STREAK</span><strong>{stats.streakDays || 0}</strong><small>Days active</small></article><article className="steel-card"><Activity size={19}/><span>VOLUME</span><strong>{Math.round(stats.volumeKg || 0).toLocaleString('en-GB')}</strong><small>kg this month</small></article><article className="steel-card"><Footprints size={19}/><span>STEPS</span><strong>{totalSteps.toLocaleString('en-GB')}</strong><small>Last 30 days</small></article></section><section className="progress-detail-grid"><article className="steel-card progress-detail-card"><div className="section-heading"><div><span className="eyebrow">TRAINING RHYTHM</span><h3>Recent consistency</h3></div><Target size={19}/></div><div className="progress-detail-values"><div><span>Recent sessions</span><strong>{sessions.length}</strong></div><div><span>Average duration</span><strong>{averageDuration || '—'}{averageDuration ? ' min' : ''}</strong></div><div><span>Latest session</span><strong>{stats.latestSession ? formatDate(stats.latestSession.session_date) : '—'}</strong></div></div></article><article className="steel-card progress-detail-card"><div className="section-heading"><div><span className="eyebrow">BODY WEIGHT</span><h3>Long-term trend</h3></div><Scale size={19}/></div><div className="progress-detail-values"><div><span>Current</span><strong>{latestWeight !== null ? `${latestWeight.toFixed(1)} lb` : '—'}</strong></div><div><span>Change</span><strong className={weightChange !== null && weightChange <= 0 ? 'positive' : ''}>{weightChange === null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lb`}</strong></div><div><span>Check-ins</span><strong>{weights.length}</strong></div></div></article></section><section className="progress-chart-grid"><article className="steel-card progress-chart-card"><div className="section-heading"><div><span className="eyebrow">WEIGHT TREND</span><h3>Body weight</h3></div><span className="chart-period">{weights.length ? `${weights.length} check-ins` : 'No data yet'}</span></div><WeightChart data={weights}/></article><article className="steel-card progress-chart-card"><div className="section-heading"><div><span className="eyebrow">MOVEMENT TREND</span><h3>Steps</h3></div><span className="chart-period">Last 30 days</span></div><StepsChart data={stepHistory}/></article></section><section className="steel-card"><div className="section-heading"><div><span className="eyebrow">RECENT SESSIONS</span><h3>Training history</h3></div><Dumbbell size={20}/></div>{sessions.length ? sessions.map((session) => <div className="history-row session-history" key={session.id}><div><strong>{session.workout_name}</strong><span>{formatDate(session.session_date)}{session.notes ? ` · ${session.notes}` : ''}</span></div><small>{session.duration_min || 45} min</small></div>) : <p className="muted-copy">Completed sessions will appear here.</p>}</section></div>
}

function WeightPage({ latestWeight, weightDelta, weights, weightInput, setWeightInput, submitWeight, saving }) {
  return <div className="page-stack weight-page"><section className="page-intro"><span className="eyebrow">WEIGHT</span><h2>Body weight</h2><p>Log a quick check-in and see your trend without digging through the app.</p></section><article className="weight-overview-card"><div><span className="eyebrow">CURRENT WEIGHT</span><strong>{latestWeight ? `${latestWeight.toFixed(1)} lb` : 'No check-in yet'}</strong><small>{weightDelta === null ? 'Your next check-in will start the comparison.' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} lb since your previous check-in`}</small></div><Scale size={30}/></article><form className="weight-entry-card" onSubmit={submitWeight}><div><span className="eyebrow">QUICK CHECK-IN</span><h3>How much do you weigh today?</h3><p>Your check-in updates the Home and Progress views.</p></div><div className="weight-entry-row"><label><input type="number" min="60" max="700" step=".1" inputMode="decimal" placeholder={latestWeight ? latestWeight.toFixed(1) : 'Enter weight'} value={weightInput} onChange={(event) => setWeightInput(event.target.value)} aria-label="Weight in pounds"/><span>lb</span></label><button className="gold-button" disabled={saving || !weightInput}><Save size={17}/>{saving ? 'Saving…' : 'Save check-in'}</button></div></form><section className="steel-card weight-history-card"><div className="section-heading"><div><span className="eyebrow">YOUR TREND</span><h3>Weight history</h3></div><span className="chart-period">{weights.length ? `${weights.length} check-ins` : 'Ready when you are'}</span></div><WeightChart data={weights}/>{weights.length ? <div className="weight-history-list">{[...weights].reverse().slice(0, 8).map((weight) => <div className="history-row" key={weight.id}><span>{formatDate(weight.checkin_date)}</span><strong>{Number(weight.weight_lb).toFixed(1)} lb</strong></div>)}</div> : <p className="muted-copy">Your check-ins will appear here as a simple trend.</p>}</section></div>
}

function WeeklyCheckinPage({ checkin, activitySummary, mediaItems, historyItems, onSave, onUploadMedia, saving, mediaBusy }) {
  const blank = { energy: 3, sleep: 3, stress: 3, soreness: 3, weightLb: '', waistCm: '', chestBustCm: '', hipsCm: '', armCm: '', thighCm: '', workoutsCompleted: activitySummary?.workoutsCompleted || 0, nutritionDays: activitySummary?.nutritionDays || 0, painOrInjury: '', wins: '', challenges: '', questions: '' }
  const [form, setForm] = useState(blank)
  const [editingAdherence, setEditingAdherence] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  useEffect(() => {
    setForm({ ...blank, workoutsCompleted: checkin?.workouts_completed ?? activitySummary?.workoutsCompleted ?? 0, nutritionDays: checkin?.nutrition_days ?? activitySummary?.nutritionDays ?? 0, energy: checkin?.energy || 3, sleep: checkin?.sleep || 3, stress: checkin?.stress || 3, soreness: checkin?.soreness || 3, weightLb: checkin?.weight_lb || '', waistCm: checkin?.waist_cm || '', chestBustCm: checkin?.chest_bust_cm || '', hipsCm: checkin?.hips_cm || '', armCm: checkin?.arm_cm || '', thighCm: checkin?.thigh_cm || '', painOrInjury: checkin?.pain_or_injury || '', wins: checkin?.wins || '', challenges: checkin?.challenges || '', questions: checkin?.questions || '' })
    setEditingAdherence(Boolean(checkin))
  }, [checkin?.id, activitySummary?.workoutsCompleted, activitySummary?.nutritionDays])
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  const mediaSlots = [['front','Front photo'],['side','Side photo'],['back','Back photo'],['exercise_video','Exercise video']]
  return <div className="page-stack checkin-page"><section className="page-intro"><span className="eyebrow">WEEKLY CHECK-IN</span><h2>How did your week go?</h2><p>A quick reflection helps Steel spot what’s working and what needs adjusting.</p></section><section className="checkin-status-card"><div><span className="eyebrow">THIS WEEK</span><strong>{checkin ? 'Check-in ready to update' : 'Your first check-in'}</strong><span>{checkin ? 'Last submitted ' + formatDate(checkin.submitted_at) : 'Your activity totals are pulled in automatically.'}</span></div><ClipboardCheck size={28}/></section><form className="checkin-form" onSubmit={(event) => { event.preventDefault(); onSave(form) }}><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">HOW YOU FEEL</span><h3>Rate your week</h3></div><Activity size={19}/></div><div className="checkin-rating-grid">{[['energy','Energy'],['sleep','Sleep quality'],['stress','Stress'],['soreness','Soreness']].map(([field,label]) => <label key={field}><span>{label}</span><select value={form[field]} onChange={(event) => update(field, Number(event.target.value))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div></section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">BODY DATA</span><h3>Measurements</h3></div><Scale size={19}/></div><p className="checkin-media-copy">Optional measurements help your PT give more useful feedback over time.</p><div className="checkin-measurement-grid">{[['weightLb','Weight','lb'],['waistCm','Waist','cm'],['chestBustCm','Chest / bust','cm'],['hipsCm','Hips','cm'],['armCm','Arm','cm'],['thighCm','Thigh','cm']].map(([field,label,unit]) => <label key={field}><span>{label} ({unit})</span><input type="number" min="0" step=".1" inputMode="decimal" placeholder="Optional" value={form[field]} onChange={(event) => update(field, event.target.value)}/></label>)}</div></section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">ADHERENCE</span><h3>What did you complete?</h3></div><Target size={19}/></div>{editingAdherence ? <><div className="checkin-adherence-grid"><label><span>Workouts completed</span><input type="number" min="0" max="14" value={form.workoutsCompleted} onChange={(event) => update('workoutsCompleted', Number(event.target.value))}/></label><label><span>Days nutrition was on track</span><input type="number" min="0" max="7" value={form.nutritionDays} onChange={(event) => update('nutritionDays', Number(event.target.value))}/></label></div><button type="button" className="checkin-edit-button" onClick={() => setEditingAdherence(false)}>Use activity totals</button></> : <div className="checkin-auto-values"><div><strong>{form.workoutsCompleted}</strong><span>completed workouts</span></div><div><strong>{form.nutritionDays}</strong><span>nutrition days on track</span></div><button type="button" className="checkin-edit-button" onClick={() => setEditingAdherence(true)}>Edit</button></div>}</section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">FORM FEEDBACK</span><h3>Front, side, back and movement</h3></div><Camera size={19}/></div><p className="checkin-media-copy">Add progress photos or a form video for your future PT. Maximum 25 MB per file.</p><div className="checkin-upload-grid">{mediaSlots.map(([mediaType,label]) => { const attached = mediaItems?.find((item) => item.media_type === mediaType); return <label className="checkin-upload-button" key={mediaType}><Camera size={16}/><span>{attached ? label + ' attached' : mediaBusy ? 'Uploading…' : label}</span><input type="file" accept={mediaType === 'exercise_video' ? 'video/*' : 'image/*'} onChange={(event) => { if (event.target.files?.[0]) onUploadMedia(event.target.files[0], mediaType); event.target.value = '' }} disabled={mediaBusy}/></label> })}</div></section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">CONTEXT</span><h3>Anything Steel should know?</h3></div><MessageSquare size={19}/></div><label className="checkin-full-field"><span>Pain, soreness or injury notes</span><textarea rows="2" value={form.painOrInjury} onChange={(event) => update('painOrInjury', event.target.value)} placeholder="Optional — tell us what to modify or avoid."/></label><label className="checkin-full-field"><span>Wins this week</span><textarea rows="3" value={form.wins} onChange={(event) => update('wins', event.target.value)} placeholder="What are you proud of?"/></label><label className="checkin-full-field"><span>Challenges or questions</span><textarea rows="3" value={form.challenges} onChange={(event) => update('challenges', event.target.value)} placeholder="Where did you get stuck, or what should Steel help with?"/></label><label className="checkin-full-field"><span>Message for your future PT</span><textarea rows="2" value={form.questions} onChange={(event) => update('questions', event.target.value)} placeholder="Optional — this will be ready for your future coaching dashboard."/></label></section><button className="gold-button checkin-submit" disabled={saving}><ClipboardCheck size={17}/>{saving ? 'Saving check-in…' : 'Submit weekly check-in'}</button></form><button type="button" className="checkin-history-link" onClick={() => setHistoryOpen((open) => !open)}>{historyOpen ? 'Hide check-in history' : 'View check-in history'} <ChevronRight size={14}/></button>{historyOpen && <section className="steel-card checkin-history"><div className="section-heading"><div><span className="eyebrow">YOUR HISTORY</span><h3>Previous check-ins</h3></div><ClipboardCheck size={19}/></div>{historyItems?.length ? historyItems.map((item) => <article className="checkin-history-row" key={item.id}><div><strong>{formatDate(item.week_start)}</strong><span>{item.workouts_completed || 0} workouts · {item.nutrition_days || 0} nutrition days</span></div><small>{item.weight_lb ? item.weight_lb + ' lb' : 'No weight'}</small></article>) : <p className="muted-copy">Your previous submissions will appear here.</p>}</section>}</div>
}

function Avatar({ url, size = 36 }) {
  return url ? <img className="profile-image" src={url} alt="Profile" style={{ width: size, height: size }} /> : <span className="account-avatar" style={{ width: size, height: size }}><UserRound size={Math.max(17, size * .45)} /></span>
}

function PreferencesForm({ preferences, setPreferences, toggleEquipment, onSubmit, saving }) {
  return <form className="steel-card preferences-form" onSubmit={onSubmit}><div className="settings-form-heading"><div><span className="eyebrow">TRAINING PREFERENCES</span><h3>Shape your Steel plan</h3></div><Target size={20}/></div><p className="settings-form-copy">These preferences give your future AI trainer the context to make better recommendations.</p><label><span>Primary goal</span><select value={preferences.goal} onChange={e=>setPreferences({...preferences, goal:e.target.value})}><option>Lose fat and gain muscle</option><option>Build muscle</option><option>Get stronger</option><option>Improve fitness</option><option>Train consistently</option></select></label><fieldset><legend>Experience level</legend><div className="preference-choice-grid">{experienceOptions.map(option=><button type="button" key={option} className={preferences.experienceLevel===option?'selected':''} aria-pressed={preferences.experienceLevel===option} onClick={()=>setPreferences({...preferences, experienceLevel:option})}>{option}</button>)}</div></fieldset><fieldset><legend>Available equipment</legend><div className="equipment-choice-grid">{equipmentOptions.map(option=><button type="button" key={option} className={preferences.availableEquipment.includes(option)?'selected':''} aria-pressed={preferences.availableEquipment.includes(option)} onClick={()=>toggleEquipment(option)}>{preferences.availableEquipment.includes(option)?'✓ ':''}{option}</button>)}</div><small className="field-hint">Select everything you can use. Keep at least one option selected.</small></fieldset><div className="preference-split"><label><span>Training days per week</span><select value={preferences.trainingDays} onChange={e=>setPreferences({...preferences, trainingDays:Number(e.target.value)})}>{[1,2,3,4,5,6,7].map(day=><option key={day} value={day}>{day} {day===1?'day':'days'}</option>)}</select></label><label><span>Weight units</span><select value={preferences.units} onChange={e=>setPreferences({...preferences, units:e.target.value})}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label></div><label><span>Injuries, limitations or anything Steel should know</span><textarea value={preferences.limitations} onChange={e=>setPreferences({...preferences, limitations:e.target.value})} placeholder="Optional — for example, shoulder discomfort or a movement to avoid." rows="3"/></label><div className="settings-form-divider"><span className="eyebrow">MEAL PREFERENCES</span><strong>Give future meal plans the right guardrails.</strong></div><label><span>Dietary preference</span><select value={preferences.dietaryPreference} onChange={e=>setPreferences({...preferences, dietaryPreference:e.target.value})}>{dietaryOptions.map(option=><option key={option}>{option}</option>)}</select></label><div className="preference-split"><label><span>Preferred meals per day</span><select value={preferences.mealsPerDay} onChange={e=>setPreferences({...preferences, mealsPerDay:Number(e.target.value)})}>{[2,3,4,5,6].map(meals=><option key={meals} value={meals}>{meals} meals</option>)}</select></label><label><span>Allergies or intolerances</span><input value={preferences.allergies} onChange={e=>setPreferences({...preferences, allergies:e.target.value})} placeholder="Optional"/></label></div><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save preferences'}</button></form>
}

function LegacyOnboardingFlow({ preferences, setPreferences, toggleEquipment, onComplete, onSkip, saving, onSignOut }) {
  const [step, setStep] = useState(0)
  const isLast = step === 2
  function advance(event) {
    event.preventDefault()
    if (isLast) return onComplete(event)
    setStep((current) => current + 1)
  }
  return <main className="onboarding-shell"><section className="onboarding-card"><div className="onboarding-brand"><div className="brand-emblem"><SteelMark /></div><div><span className="eyebrow">PROJECT STEEL</span><strong>BUILD YOUR BASE</strong></div></div><div className="onboarding-progress" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / 3) * 100}%` }}/></div><button type="button" className="onboarding-skip" onClick={onSkip}>Set up later</button><div className="onboarding-step-copy"><span className="eyebrow">STEP {step + 1} OF 3</span>{step === 0 && <><h1>What are you building toward?</h1><p>Steel uses this to shape the right training direction for you.</p></>}{step === 1 && <><h1>Make it fit your week.</h1><p>Tell us what you can train with and how often you want to show up.</p></>}{step === 2 && <><h1>Train safely and consistently.</h1><p>Anything you share here helps Steel make more thoughtful recommendations.</p></>}</div><form className="onboarding-form" onSubmit={advance}>{step === 0 && <><fieldset><legend>Primary goal</legend><div className="onboarding-option-list">{['Lose fat and gain muscle','Build muscle','Get stronger','Improve fitness','Train consistently'].map(option=><button type="button" key={option} className={preferences.goal===option?'selected':''} aria-pressed={preferences.goal===option} onClick={()=>setPreferences({...preferences,goal:option})}>{option}<ChevronRight size={17}/></button>)}</div></fieldset><fieldset><legend>Experience level</legend><div className="preference-choice-grid">{experienceOptions.map(option=><button type="button" key={option} className={preferences.experienceLevel===option?'selected':''} aria-pressed={preferences.experienceLevel===option} onClick={()=>setPreferences({...preferences,experienceLevel:option})}>{option}</button>)}</div></fieldset></>}{step === 1 && <><fieldset><legend>Available equipment</legend><div className="equipment-choice-grid">{equipmentOptions.map(option=><button type="button" key={option} className={preferences.availableEquipment.includes(option)?'selected':''} aria-pressed={preferences.availableEquipment.includes(option)} onClick={()=>toggleEquipment(option)}>{preferences.availableEquipment.includes(option)?'✓ ':''}{option}</button>)}</div><small className="field-hint">Select everything you can use. Keep at least one option selected.</small></fieldset><div className="preference-split"><label><span>Training days per week</span><select value={preferences.trainingDays} onChange={e=>setPreferences({...preferences,trainingDays:Number(e.target.value)})}>{[1,2,3,4,5,6,7].map(day=><option key={day} value={day}>{day} {day===1?'day':'days'}</option>)}</select></label><label><span>Weight units</span><select value={preferences.units} onChange={e=>setPreferences({...preferences,units:e.target.value})}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label></div></>}{step === 2 && <label><span>Injuries, limitations or anything Steel should know</span><textarea value={preferences.limitations} onChange={e=>setPreferences({...preferences,limitations:e.target.value})} placeholder="Optional — for example, shoulder discomfort or a movement to avoid." rows="5"/><small className="field-hint">You can leave this blank and update it later in Settings.</small></label>}<div className="onboarding-actions"><button type="button" className="text-button" onClick={step===0?onSignOut:()=>setStep((current)=>current-1)}>{step===0?'Sign out':'Back'}</button><button className="gold-button" disabled={saving}>{isLast?(saving?'Building your plan…':'Finish setup'):<><span>Continue</span><ArrowRight size={17}/></>}</button></div></form></section></main>
}

function OnboardingFlow({ preferences, setPreferences, toggleEquipment, onComplete, onSkip, saving, onSignOut }) {
  const [step, setStep] = useState(0)
  const isLast = step === 3
  function advance(event) {
    event.preventDefault()
    if (isLast) return onComplete(event)
    setStep((current) => current + 1)
  }
  return <main className="onboarding-shell"><section className="onboarding-card"><div className="onboarding-brand"><div className="brand-emblem"><SteelMark /></div><div><span className="eyebrow">PROJECT STEEL</span><strong>BUILD YOUR BASE</strong></div></div><div className="onboarding-progress" role="progressbar" aria-valuemin="1" aria-valuemax="4" aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / 4) * 100}%` }}/></div><button type="button" className="onboarding-skip" onClick={onSkip}>Set up later</button><div className="onboarding-step-copy"><span className="eyebrow">STEP {step + 1} OF 4</span>{step === 0 && <><h1>What are you building toward?</h1><p>Steel uses this to shape the right training direction for you.</p></>}{step === 1 && <><h1>Make it fit your week.</h1><p>Tell us what you can train with and how often you want to show up.</p></>}{step === 2 && <><h1>Train safely and consistently.</h1><p>Anything you share here helps Steel make more thoughtful recommendations.</p></>}{step === 3 && <><h1>Let’s make food work for you.</h1><p>These preferences will guide future meal ideas around your routine.</p></>}</div><form className="onboarding-form" onSubmit={advance}>{step === 0 && <><fieldset><legend>Primary goal</legend><div className="onboarding-option-list">{['Lose fat and gain muscle','Build muscle','Get stronger','Improve fitness','Train consistently'].map(option=><button type="button" key={option} className={preferences.goal===option?'selected':''} aria-pressed={preferences.goal===option} onClick={()=>setPreferences({...preferences,goal:option})}>{option}<ChevronRight size={17}/></button>)}</div></fieldset><fieldset><legend>Experience level</legend><div className="preference-choice-grid">{experienceOptions.map(option=><button type="button" key={option} className={preferences.experienceLevel===option?'selected':''} aria-pressed={preferences.experienceLevel===option} onClick={()=>setPreferences({...preferences,experienceLevel:option})}>{option}</button>)}</div></fieldset></>}{step === 1 && <><fieldset><legend>Available equipment</legend><div className="equipment-choice-grid">{equipmentOptions.map(option=><button type="button" key={option} className={preferences.availableEquipment.includes(option)?'selected':''} aria-pressed={preferences.availableEquipment.includes(option)} onClick={()=>toggleEquipment(option)}>{preferences.availableEquipment.includes(option)?'✓ ':''}{option}</button>)}</div><small className="field-hint">Select everything you can use. Keep at least one option selected.</small></fieldset><div className="preference-split"><label><span>Training days per week</span><select value={preferences.trainingDays} onChange={e=>setPreferences({...preferences,trainingDays:Number(e.target.value)})}>{[1,2,3,4,5,6,7].map(day=><option key={day} value={day}>{day} {day===1?'day':'days'}</option>)}</select></label><label><span>Weight units</span><select value={preferences.units} onChange={e=>setPreferences({...preferences,units:e.target.value})}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label></div></>}{step === 2 && <label><span>Injuries, limitations or anything Steel should know</span><textarea value={preferences.limitations} onChange={e=>setPreferences({...preferences,limitations:e.target.value})} placeholder="Optional — for example, shoulder discomfort or a movement to avoid." rows="5"/><small className="field-hint">You can leave this blank and update it later in Settings.</small></label>}{step === 3 && <><label><span>Dietary preference</span><select value={preferences.dietaryPreference} onChange={e=>setPreferences({...preferences,dietaryPreference:e.target.value})}>{dietaryOptions.map(option=><option key={option}>{option}</option>)}</select></label><label><span>Preferred meals per day</span><select value={preferences.mealsPerDay} onChange={e=>setPreferences({...preferences,mealsPerDay:Number(e.target.value)})}>{[2,3,4,5,6].map(meals=><option key={meals} value={meals}>{meals} meals</option>)}</select></label><label><span>Allergies or intolerances</span><textarea value={preferences.allergies} onChange={e=>setPreferences({...preferences,allergies:e.target.value})} placeholder="Optional — for example, nuts, lactose or gluten." rows="4"/><small className="field-hint">You can update this later in Settings.</small></label></>}<div className="onboarding-actions"><button type="button" className="text-button" onClick={step===0?onSignOut:()=>setStep((current)=>current-1)}>{step===0?'Sign out':'Back'}</button><button className="gold-button" disabled={saving}>{isLast?(saving?'Building your plan…':'Finish setup'):<><span>Continue</span><ArrowRight size={17}/></>}</button></div></form></section></main>
}

function NutritionPage({ preferences, navigateToTab, userId }) {
  const [nutritionView, setNutritionView] = useState('plan')
  const [loggedMeals, setLoggedMeals] = useState([])
  const [openRecipe, setOpenRecipe] = useState(null)
  const fallbackRecipes = [
    { meal: 'BREAKFAST', name: 'Protein power bowl', detail: 'Greek yoghurt · oats · berries · seeds', calories: 420, protein: 32, carbs: 48, fat: 12, ingredients: ['250g Greek yoghurt', '50g oats', '100g berries', '10g mixed seeds'], instructions: 'Stir the yoghurt and oats together, top with berries and seeds, then chill for 5 minutes.' },
    { meal: 'LUNCH', name: 'Steel chicken bowl', detail: 'Chicken · rice · greens · salsa', calories: 580, protein: 48, carbs: 58, fat: 16, ingredients: ['150g chicken breast', '120g cooked rice', '2 handfuls greens', '2 tbsp tomato salsa'], instructions: 'Season and cook the chicken through, warm the rice, then assemble with greens and salsa.' },
    { meal: 'DINNER', name: 'Salmon & roasted vegetables', detail: 'Salmon · potatoes · seasonal greens', calories: 640, protein: 44, carbs: 52, fat: 24, ingredients: ['150g salmon fillet', '200g baby potatoes', '200g seasonal vegetables', '1 tsp olive oil'], instructions: 'Roast the potatoes and vegetables at 200°C, add the salmon for the final 12–15 minutes, and serve.' },
    { meal: 'SNACK', name: 'Cocoa protein oats', detail: 'Oats · milk · banana · protein', calories: 360, protein: 28, carbs: 46, fat: 8, ingredients: ['40g oats', '200ml milk', '1 small banana', '25g protein powder', '1 tsp cocoa'], instructions: 'Simmer oats with milk, stir through protein powder and cocoa off the heat, then finish with banana.' },
  ]
  const [recipes, setRecipes] = useState(fallbackRecipes)
  const [target, setTarget] = useState({ calories: 2050, protein_g: 170 })
  const [planBusy, setPlanBusy] = useState(true)
  const [planError, setPlanError] = useState('')
  async function loadPlan() {
    setPlanBusy(true)
    setPlanError('')
    try {
      const plan = await getNutritionPlan(userId)
      if (plan.target) setTarget({ calories: plan.target.calories || 2050, protein_g: plan.target.protein_g || 170 })
      if (plan.meals.length) setRecipes(plan.meals.map((meal) => ({ meal: (meal.meal_type || 'MEAL').toUpperCase(), name: meal.title, detail: meal.description || 'Assigned recipe details', calories: meal.calories || 0, protein: meal.protein_g || 0, carbs: null, fat: null, ingredients: meal.description ? [meal.description] : ['Ingredients will be added to this assigned recipe.'], instructions: 'Use the ingredients above and follow the preparation notes supplied with this assigned meal.' })))
    } catch (error) {
      setPlanError(error.message || 'Your assigned recipes could not be loaded.')
    } finally {
      setPlanBusy(false)
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  useEffect(() => { loadPlan(); getMealLogs(userId, today, today).then((rows) => setLoggedMeals(rows.map((row) => row.meal_type))).catch(() => {}) }, [userId])
  async function toggleMeal(recipe) {
    const isLogged = loggedMeals.includes(recipe.meal)
    setLoggedMeals((current) => isLogged ? current.filter((label) => label !== recipe.meal) : [...current, recipe.meal])
    try {
      if (isLogged) await deleteMealLog({ userId, mealDate: today, mealType: recipe.meal })
      else await saveMealLog({ userId, mealDate: today, mealType: recipe.meal, recipeName: recipe.name, calories: recipe.calories })
    } catch (error) {
      setLoggedMeals((current) => isLogged ? [...current, recipe.meal] : current.filter((label) => label !== recipe.meal))
    }
  }
  const dietary = preferences.dietaryPreference || 'No preference'
  const allergyWords = (preferences.allergies || '').toLowerCase().split(/[,;]+/).map((word) => word.trim()).filter(Boolean)
  const assignedRecipes = recipes.filter((recipe) => {
    const text = `${recipe.name} ${recipe.detail} ${recipe.ingredients.join(' ')}`.toLowerCase()
    return !allergyWords.some((word) => word.length > 2 && text.includes(word))
  })
  const loggedCalories = assignedRecipes.filter((recipe) => loggedMeals.includes(recipe.meal)).reduce((total, recipe) => total + recipe.calories, 0)
  return <div className="page-stack nutrition-page"><section className="page-intro"><span className="eyebrow">FUEL YOUR GOAL</span><h2>{nutritionView === 'plan' ? 'Your meal plan' : 'Recipe library'}</h2><p>{nutritionView === 'plan' ? 'Your assigned meals for today, with your targets and daily progress in one place.' : `Browse the recipes assigned around your ${dietary === 'No preference' ? 'training plan' : dietary.toLowerCase()} preferences.`}</p><div className="nutrition-view-switcher" role="tablist" aria-label="Nutrition views"><button type="button" className={nutritionView === 'plan' ? 'active' : ''} onClick={() => setNutritionView('plan')}>Your meal plan</button><button type="button" className={nutritionView === 'library' ? 'active' : ''} onClick={() => setNutritionView('library')}>Recipe library</button></div></section>{planError && <div className="nutrition-plan-alert"><span>Showing your starter meals while your assigned plan reconnects.</span><button type="button" onClick={loadPlan}>Try again</button></div>}<article className="nutrition-hero"><div className="macro-orb"><span>{loggedCalories.toLocaleString('en-GB')}</span><small>kcal logged</small></div><div><span className="eyebrow">TODAY’S TARGET</span><h3>{target.calories.toLocaleString('en-GB')} kcal · {target.protein_g}g protein</h3><p>{dietary} · {preferences.mealsPerDay} meals per day · {assignedRecipes.length} assigned meals</p></div></article>{nutritionView === 'plan' && <section className="nutrition-plan-summary"><div><span className="eyebrow">TODAY’S PLAN</span><strong>{loggedMeals.length} of {assignedRecipes.length} meals logged</strong></div><button type="button" className="text-link" onClick={() => setNutritionView('library')}>Change a meal <ChevronRight size={14}/></button></section>}<section className="nutrition-plan-list"><div className="section-heading"><div><span className="eyebrow">{nutritionView === 'plan' ? 'YOUR ASSIGNED MEALS' : 'RECIPE LIBRARY'}</span><h3>{nutritionView === 'plan' ? 'Today’s meals' : 'Browse recipes'}</h3></div><span className="nutrition-progress">{loggedMeals.length} / {assignedRecipes.length} logged</span></div>{planBusy ? <div className="library-state">Loading your meal plan…</div> : assignedRecipes.length ? assignedRecipes.map((recipe)=><article className={`steel-card nutrition-meal-card ${loggedMeals.includes(recipe.meal) ? 'is-logged' : ''} ${openRecipe === recipe.name ? 'is-expanded' : ''}`} key={recipe.name}><div className="nutrition-meal-icon"><Salad size={19}/></div><div className="nutrition-recipe-copy"><span className="eyebrow">{recipe.meal}</span><h3>{recipe.name}</h3><p>{recipe.detail}</p><small>{recipe.calories} kcal · {recipe.protein}g protein{recipe.carbs !== null ? ` · ${recipe.carbs}g carbs · ${recipe.fat}g fat` : ''}</small>{openRecipe === recipe.name && <div className="recipe-detail"><strong>Ingredients</strong><span>{recipe.ingredients.join(' · ')}</span><strong>How to make it</strong><span>{recipe.instructions}</span></div>}</div><div className="nutrition-meal-actions"><button type="button" className="nutrition-details-button" onClick={() => setOpenRecipe(openRecipe === recipe.name ? null : recipe.name)}>{openRecipe === recipe.name ? 'Hide' : 'Recipe'}</button><button type="button" className="nutrition-log-button" onClick={() => toggleMeal(recipe)}>{loggedMeals.includes(recipe.meal) ? 'Logged' : 'Log'}</button></div></article>) : <div className="library-state"><strong>No assigned meals yet.</strong><span>Complete your nutrition preferences in Settings so Steel can prepare your meal plan.</span><button type="button" className="library-retry" onClick={() => navigateToTab('Settings')}>Open Settings</button></div>}</section><section className="nutrition-next-card"><div><span className="eyebrow">PLAN CONTROLS</span><h3>Want to tailor your plan?</h3><p>Update dietary preferences or allergies in Settings. Macro editing, meal swaps, custom foods and nutrition tracking are queued for the next nutrition pass.</p></div><button type="button" className="text-link" onClick={() => navigateToTab('Settings')}>Edit preferences <ChevronRight size={14}/></button></section></div>
}

function ExerciseDetailPanel({ exercise, onClose }) {
  if (!exercise) return null
  const secondary = exercise.secondary_muscle_groups ?? []
  return <div className="exercise-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="exercise-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title"><button type="button" className="more-sheet-close" aria-label="Close exercise details" onClick={onClose}>×</button><div className="exercise-detail-visual"><Dumbbell size={42}/><span>{exercise.primary_muscle_group}</span></div><span className="eyebrow">EXERCISE DETAIL</span><h2 id="exercise-detail-title">{exercise.name}</h2><div className="exercise-detail-tags"><span>{exercise.primary_muscle_group}</span>{secondary.slice(0, 3).map((group) => <span key={group}>{group}</span>)}<span>{exercise.difficulty}</span></div><p>{exercise.instructions || 'Use controlled reps, keep your form steady and stop if the movement causes pain.'}</p><div className="exercise-detail-facts"><div><span>Equipment</span><strong>{(exercise.equipment ?? []).join(' / ') || 'Gym'}</strong></div><div><span>Movement</span><strong>{exercise.movement_pattern || 'Strength'}</strong></div></div>{exercise.video_url ? <a className="gold-button exercise-detail-video" href={exercise.video_url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Watch form video</a> : <p className="exercise-detail-muted">Form video coming soon for this movement.</p>}<button type="button" className="exercise-detail-back" onClick={onClose}>Back to library</button></section></div>
}

function ExerciseLibrary({ onSelectExercise }) {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('All muscle groups')
  const [equipment, setEquipment] = useState('All equipment')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [selectedExercise, setSelectedExercise] = useState(null)
  function refreshLibrary() {
    setBusy(true)
    setError('')
    loadExerciseCatalog().then((items) => setRows(items)).catch((e) => setError(e.message)).finally(() => setBusy(false))
  }
  useEffect(() => { let active = true; loadExerciseCatalog().then((items) => active && setRows(items)).catch((e) => active && setError(e.message)).finally(() => active && setBusy(false)); return () => { active = false } }, [])
  const muscles = [...new Set(rows.map((row) => row.primary_muscle_group).filter(Boolean))].sort()
  const equipmentOptions = [...new Set(rows.flatMap((row) => row.equipment ?? []))].sort()
  const visibleRows = rows.filter((row) => {
    const text = `${row.name} ${row.primary_muscle_group} ${(row.secondary_muscle_groups ?? []).join(' ')}`.toLowerCase()
    return (!query.trim() || text.includes(query.trim().toLowerCase())) && (muscleGroup === 'All muscle groups' || row.primary_muscle_group === muscleGroup) && (equipment === 'All equipment' || (row.equipment ?? []).includes(equipment))
  })
  return <section className="exercise-library"><div className="library-toolbar"><label className="library-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" aria-label="Search exercises"/></label><div className="library-filters"><select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)} aria-label="Filter by muscle group"><option>All muscle groups</option>{muscles.map((muscle) => <option key={muscle}>{muscle}</option>)}</select><select value={equipment} onChange={(event) => setEquipment(event.target.value)} aria-label="Filter by equipment"><option>All equipment</option>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select></div></div>{busy ? <div className="library-state"><span>Loading the exercise library…</span></div> : error ? <div className="library-state library-error"><strong>We couldn’t load the library.</strong><span>Check your connection and try again.</span><button type="button" className="library-retry" onClick={refreshLibrary}>Try again</button></div> : <><div className="library-result-count">{visibleRows.length} exercise{visibleRows.length === 1 ? '' : 's'} available</div><div className="exercise-library-list">{visibleRows.map((row) => <article className="exercise-library-card" key={row.id}><div className="library-exercise-icon"><Dumbbell size={19}/></div><div className="library-exercise-copy"><strong>{row.name}</strong><span>{row.primary_muscle_group} · {(row.equipment ?? []).join(' / ') || 'Gym'}</span><small>{row.difficulty || 'All levels'} · {row.movement_pattern || 'Strength'}</small></div><div className="library-card-actions">{onSelectExercise && <button type="button" className="library-use-button" onClick={() => onSelectExercise(row)}>Use this exercise</button>}<button type="button" className="library-details-button" onClick={() => setSelectedExercise(row)}>Details</button>{row.video_url ? <a className="library-video-link" href={row.video_url} target="_blank" rel="noreferrer">Form <ExternalLink size={13}/></a> : null}</div></article>)}{!visibleRows.length && <div className="library-state">No exercises match those filters.</div>}</div></>}{selectedExercise && <ExerciseDetailPanel exercise={selectedExercise} onClose={() => setSelectedExercise(null)}/>}</section>
}

function catalogueRowFromExercise(exercise) {
  return { id: exercise.id, programmeId: exercise.programmeId ?? null, name: exercise.name, primary_muscle_group: exercise.primary_muscle_group ?? exercise.muscleGroup ?? 'Full body', secondary_muscle_groups: exercise.secondary_muscle_groups ?? exercise.secondaryMuscleGroups ?? [], equipment: Array.isArray(exercise.equipment) ? exercise.equipment : exercise.equipment ? [exercise.equipment] : [], movement_pattern: exercise.movement_pattern ?? exercise.movementPattern ?? null, difficulty: exercise.difficulty ?? null, instructions: exercise.instructions ?? null, video_url: exercise.video_url ?? exercise.youtubeUrl ?? null, sets: exercise.sets ?? 3, reps: exercise.reps ?? '8–12', startWeightKg: exercise.startWeightKg ?? 0 }
}

function SelectedExerciseEditor({ row, index, total, onChange, onMove, onRemove }) {
  return <article className="selected-exercise"><span>{index + 1}</span><div className="selected-exercise-main"><strong>{row.name}</strong><small>{row.primary_muscle_group} · {(row.equipment ?? []).join(' / ') || 'Gym'}</small><div className="selected-exercise-config"><label><span>Sets</span><input type="number" min="1" max="12" value={row.sets ?? 3} onChange={(event) => onChange({ sets: Math.max(1, Math.min(12, Number(event.target.value) || 1)) })}/></label><label><span>Reps</span><input value={row.reps ?? '8–12'} onChange={(event) => onChange({ reps: event.target.value })} maxLength="12"/></label><label><span>Start kg</span><input type="number" min="0" max="500" step="0.5" value={row.startWeightKg ?? 0} onChange={(event) => onChange({ startWeightKg: Math.max(0, Number(event.target.value) || 0) })}/></label></div></div><div className="selected-exercise-actions"><button type="button" aria-label={`Move ${row.name} up`} disabled={index === 0} onClick={() => onMove(-1)}>↑</button><button type="button" aria-label={`Move ${row.name} down`} disabled={index === total - 1} onClick={() => onMove(1)}>↓</button><button type="button" aria-label={`Remove ${row.name}`} onClick={onRemove}>×</button></div></article>
}

function LogWorkoutPage({ onCancel, onStart, onSave, initialWorkout, saving }) {
  const [catalogue, setCatalogue] = useState([])
  const [selected, setSelected] = useState(() => initialWorkout?.exercises?.map(catalogueRowFromExercise) ?? [])
  const [name, setName] = useState(initialWorkout?.name ?? '')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(true)
  const [catalogueError, setCatalogueError] = useState('')
  async function loadCatalogue() {
    setBusy(true)
    setCatalogueError('')
    try {
      const items = await loadExerciseCatalog()
      setCatalogue(items)
    } catch (error) {
      setCatalogueError(error.message || 'The exercise library is unavailable right now.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { let active = true; loadExerciseCatalog().then((items) => active && setCatalogue(items)).catch((error) => active && setCatalogueError(error.message || 'The exercise library is unavailable right now.')).finally(() => active && setBusy(false)); return () => { active = false } }, [])
  const results = catalogue.filter((row) => `${row.name} ${row.primary_muscle_group} ${(row.secondary_muscle_groups ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
  function addExercise(row) { if (!selected.some((item) => item.id === row.id)) setSelected((items) => [...items, row]) }
  function updateSelected(id, patch) { setSelected((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)) }
  function moveExercise(index, direction) { setSelected((items) => { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= items.length) return items; const next = [...items]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next }) }
  function buildWorkout() { return { id: initialWorkout?.id ?? `custom-${Date.now()}`, source: initialWorkout ? undefined : 'catalog', name: name.trim() || 'Custom workout', duration: `~${Math.max(20, selected.length * 8)} min`, finisher: 'Optional cardio finisher', exercises: selected.map((row) => ({ id: row.id, source: initialWorkout ? undefined : 'catalog', programmeId: row.programmeId ?? null, name: row.name, equipment: (row.equipment ?? []).join(' / ') || 'Gym', muscleGroup: row.primary_muscle_group ?? null, secondaryMuscleGroups: row.secondary_muscle_groups ?? [], movementPattern: row.movement_pattern ?? null, difficulty: row.difficulty ?? null, instructions: row.instructions ?? null, youtubeUrl: row.video_url ?? null, thumbnailUrl: row.thumbnail_url ?? null, sets: Math.max(1, Number(row.sets) || 3), reps: row.reps || '8–12', startWeightKg: Math.max(0, Number(row.startWeightKg) || 0) })) } }
  function submitWorkout() { const workout = buildWorkout(); if (onSave) onSave(workout); else onStart(workout) }
  function legacyStartWorkout() { onStart({ id: `custom-${Date.now()}`, source: 'catalog', name: name.trim() || 'Custom workout', duration: `~${Math.max(20, selected.length * 8)} min`, finisher: 'Optional cardio finisher', exercises: selected.map((row) => ({ id: row.id, source: 'catalog', programmeId: null, name: row.name, equipment: (row.equipment ?? []).join(' / ') || 'Gym', muscleGroup: row.primary_muscle_group ?? null, secondaryMuscleGroups: row.secondary_muscle_groups ?? [], movementPattern: row.movement_pattern ?? null, difficulty: row.difficulty ?? null, instructions: row.instructions ?? null, youtubeUrl: row.video_url ?? null, thumbnailUrl: row.thumbnail_url ?? null, sets: 3, reps: '8–12' })) }) }
  return <div className="page-stack log-workout-page"><section className="page-intro"><button type="button" className="settings-back-button" onClick={onCancel}><ArrowLeft size={17}/> Back to workouts</button><span className="eyebrow">BUILD A SESSION</span><h2>{initialWorkout ? 'Edit workout' : 'Custom workout'}</h2><p>{initialWorkout ? 'Adjust the name, exercises or starting data. Your saved workout will update.' : 'Pick exercises, set your starting numbers and take control of today’s session.'}</p></section><label className="log-workout-name"><span>Workout name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Upper body session" maxLength="60"/></label><section className="selected-exercises"><div className="section-heading"><div><span className="eyebrow">YOUR SESSION</span><h3>{selected.length ? `${selected.length} exercise${selected.length === 1 ? '' : 's'}` : 'Add exercises'}</h3></div>{selected.length ? <span className="library-result-count">Set your defaults below</span> : null}</div>{selected.length ? <div className="selected-exercise-list">{selected.map((row, index) => <SelectedExerciseEditor key={row.id} row={row} index={index} total={selected.length} onChange={(patch) => updateSelected(row.id, patch)} onMove={(direction) => moveExercise(index, direction)} onRemove={() => setSelected((items) => items.filter((item) => item.id !== row.id))}/>)}</div> : <div className="library-state">Start by adding an exercise below.</div>}</section><section className="log-exercise-picker"><div className="section-heading"><div><span className="eyebrow">EXERCISE LIBRARY</span><h3>Add to session</h3></div></div><label className="library-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by exercise or muscle" aria-label="Search exercises to add"/></label>{busy ? <div className="library-state">Loading exercises…</div> : catalogueError ? <div className="library-state library-error"><strong>We couldn’t load exercises.</strong><span>Check your connection and try again.</span><button type="button" className="library-retry" onClick={loadCatalogue}>Try again</button></div> : catalogue.length ? <div className="exercise-picker-list">{results.map((row) => <button type="button" key={row.id} disabled={selected.some((item) => item.id === row.id)} onClick={() => addExercise(row)}><span className="picker-exercise-icon"><Dumbbell size={18}/></span><span><strong>{row.name}</strong><small>{row.primary_muscle_group} · {(row.equipment ?? []).join(' / ')}</small></span><span className="add-exercise-label">{selected.some((item) => item.id === row.id) ? 'Added' : 'Add'}</span></button>)}</div> : <div className="library-state"><strong>No exercises are available yet.</strong><span>Try again later or return to your workouts.</span></div>}</section><button type="button" className="gold-button log-workout-start" disabled={!selected.length || saving} onClick={submitWorkout}><Play size={17}/> {saving ? 'Saving workout…' : initialWorkout ? 'Save changes' : 'Save & start workout'}</button></div>
}

function PlanPage({ workouts, openWorkout, onLogWorkout, onEditWorkout, onDuplicateWorkout, libraryMode, onSelectExercise, onCancelLibrary }) {
  const [view, setView] = useState(libraryMode ? 'library' : 'programme')
  useEffect(() => { if (libraryMode) setView('library') }, [libraryMode])
  return <div className="page-stack"><section className="page-intro">{libraryMode && <button type="button" className="settings-back-button" onClick={onCancelLibrary}><ArrowLeft size={17}/> Back to active workout</button>}<span className="eyebrow">YOUR TRAINING</span><h2>{view === 'programme' ? 'Workouts' : libraryMode ? 'Choose a replacement' : 'Exercise library'}</h2><p>{view === 'programme' ? 'Your focused sessions, ready when you are.' : libraryMode ? 'Choose any movement that suits you today. Your session stays yours.' : 'Find the right movement without leaving your training flow.'}</p><div className="page-switcher" role="tablist" aria-label="Workouts and exercise library"><button type="button" className={view === 'programme' ? 'active' : ''} onClick={() => setView('programme')}>My workouts</button><button type="button" className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>Exercise library</button></div></section>{view === 'programme' ? <><button type="button" className="log-workout-cta" onClick={onLogWorkout}><Play size={17}/><span><strong>Log a different workout</strong><small>Build today’s session from the exercise library</small></span><ChevronRight size={17}/></button>{workouts.length ? workouts.map((workout, index) => <article className="plan-block" key={workout.id}><div className={`plan-image plan-image-${index + 1}`}><div className="plan-image-icon"><Dumbbell size={34}/></div><span>WORKOUT {index + 1}</span></div><div className="plan-content"><div className="plan-title-row"><div><h3>{workout.name}</h3><p>{workout.exercises.length} exercises · {workout.duration}</p></div><button className="circle-button" aria-label={`Start ${workout.name}`} onClick={() => openWorkout(workout)}><ArrowRight size={18}/></button></div>{workout.source !== 'catalog' && <div className="plan-secondary-actions"><button type="button" onClick={() => onEditWorkout(workout)}>Edit</button><button type="button" onClick={() => onDuplicateWorkout(workout)}>Duplicate</button></div>}<div className="compact-exercise-list">{workout.exercises.map((exercise, exerciseIndex) => <div className="compact-exercise" key={exercise.id}><span>{exerciseIndex + 1}</span><div><strong>{exercise.name}</strong><small>{exercise.muscleGroup ? `${exercise.muscleGroup} · ` : ''}{exercise.equipment} · {exercise.sets} × {exercise.reps}</small></div></div>)}</div><div className="finisher-badge"><Flame size={15}/> {workout.finisher}</div></div></article>) : <div className="library-state plan-empty-state"><strong>No saved workouts yet.</strong><span>Build a session from the exercise library to get started.</span><button type="button" className="library-retry" onClick={onLogWorkout}>Create a workout</button></div>}</> : <ExerciseLibrary onSelectExercise={onSelectExercise}/>}</div>
}

function StartWorkoutChooser({ workouts, openWorkout, onBrowse, onCreateCustom }) {
  return <section className="page-stack start-workout-chooser"><section className="page-intro"><span className="eyebrow">READY WHEN YOU ARE</span><h2>Start a workout</h2><p>Choose the session that fits today. You can change exercises once you’re training.</p></section>{workouts.length ? <div className="start-workout-list">{workouts.map((workout, index) => <button type="button" className="start-workout-option" key={workout.id} onClick={() => openWorkout(workout)}><span className={`start-workout-art start-workout-art-${index + 1}`}><Dumbbell size={26}/></span><span><strong>{workout.name}</strong><small>{workout.exercises.length} exercises · {workout.duration}</small>{workout.focus && <small>{workout.focus}</small>}</span><span className="start-workout-cta">Start <ChevronRight size={17}/></span></button>)}</div> : <div className="library-state"><strong>No workouts available yet.</strong><span>Build a session from the exercise library first.</span>{onBrowse && <button type="button" className="library-retry" onClick={onBrowse}>Open workouts</button>}</div>}{onCreateCustom && <button type="button" className="custom-workout-card" onClick={onCreateCustom}><span className="custom-workout-icon"><ListChecks size={25}/></span><span><strong>Build a custom workout</strong><small>Pick exercises, set your sets, reps and starting weight.</small></span><ChevronRight size={19}/></button>}</section>
}

function SessionNotesField({ value, onChange, completedSets }) {
  return <section className="steel-card session-notes-panel"><div><span className="eyebrow">OPTIONAL</span><h3>Session notes</h3><p>Add anything worth remembering about today’s workout.</p></div><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="Energy, substitutions, how it felt…" rows="3" maxLength="500" aria-label="Session notes"/><small className="session-save-hint">{completedSets ? `${completedSets} set${completedSets === 1 ? '' : 's'} ready to save.` : 'Complete at least one set to save this session.'}</small></section>
}

function SettingsPage({ user, onSignOut, closeSettings, accountName, avatarUrl, profileName, setProfileName, profileEmail, setProfileEmail, profilePhone, setProfilePhone, saveAccount, handleAvatar, avatarBusy, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, savePassword, saving, preferences, setPreferences, toggleEquipment, savePreferences, openSupportPanel }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [healthSyncOpen, setHealthSyncOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  return <div className="page-stack settings-page-v5"><div className="settings-top-actions"><button className="settings-back-button" type="button" onClick={closeSettings}><ArrowLeft size={17}/> Back</button><button className="settings-signout-button" type="button" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div><section className="page-intro"><span className="eyebrow">PROFILE & SETTINGS</span><h2>Your Steel profile</h2><button className="settings-support-jump" type="button" onClick={() => document.getElementById('settings-support-v5')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span>Need help?</span><strong>Support &amp; feedback</strong><ChevronRight size={15}/></button></section><article className="settings-profile-card editable-profile"><div className="avatar-upload-wrap"><Avatar url={avatarUrl} size={72}/><label className="avatar-upload-button"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} disabled={avatarBusy}/></label></div><div><span className="eyebrow">DISPLAY PROFILE</span><h3>{accountName}</h3><p>{avatarBusy?'Uploading photo…':user.email}</p></div></article><SettingsDisclosure id="settings-profile-v5" eyebrow="PERSONAL PROFILE" title="Personal profile" icon={UserRound} open={profileOpen} onToggle={()=>setProfileOpen(open=>!open)}><form className="personal-profile-form" onSubmit={saveAccount}><div className="settings-subsection"><div className="settings-subsection-heading"><span className="eyebrow">CONTACT DETAILS</span><strong>Personal details</strong></div><div className="profile-form-grid"><label><span>Name</span><input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></label><label><span>Email</span><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required/></label><label><span>Phone number</span><input type="tel" autoComplete="tel" placeholder="Optional" value={profilePhone} onChange={e=>setProfilePhone(e.target.value)}/></label></div></div><div className="settings-subsection"><div className="settings-subsection-heading"><span className="eyebrow">ACCOUNT SECURITY</span><strong>Change password</strong></div><p className="settings-form-copy">Leave these blank if you only want to update your profile details.</p><label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} /></label><label><span>New password</span><input type="password" autoComplete="new-password" minLength="6" value={newPassword} onChange={e=>setNewPassword(e.target.value)} /></label><label><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength="6" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></label></div><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save profile'}</button></form></SettingsDisclosure><SettingsDisclosure id="settings-preferences-v5" eyebrow="TRAINING PREFERENCES" title="Shape your Steel plan" icon={Target} open={preferencesOpen} onToggle={()=>setPreferencesOpen(open=>!open)}><PreferencesForm preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} onSubmit={savePreferences} saving={saving}/></SettingsDisclosure><SettingsDisclosure id="settings-health-v5" eyebrow="HEALTH & WATCH SYNC" title="Step integrations" icon={Watch} open={healthSyncOpen} onToggle={()=>setHealthSyncOpen(open=>!open)}><article className="settings-security-card"><span className="settings-security-icon"><Watch size={22}/></span><div><h3>Step integrations planned</h3><p>Steel is prepared for daily step data. Next we can connect the appropriate native bridges for Apple Health, Android Health Connect/Google Fit-compatible apps, Samsung Health and supported watch ecosystems.</p></div></article><div className="health-provider-grid"><div className="health-provider"><strong>Apple Health</strong><span>iPhone + Apple Watch</span><small>Planned</small></div><div className="health-provider"><strong>Health Connect</strong><span>Android + compatible watches</span><small>Planned</small></div><div className="health-provider"><strong>Samsung Health</strong><span>Galaxy Watch ecosystem</span><small>Planned</small></div></div></SettingsDisclosure><section className="settings-support-card settings-support-footer" id="settings-support-v5"><div className="settings-footer-layout"><div className="section-heading"><div><span className="eyebrow">NEED A HAND?</span><h3>Support</h3></div></div><article className="settings-security-card"><span className="settings-security-icon"><ShieldCheck size={22}/></span><div><span className="eyebrow">YOUR DATA</span><h3>Private by default</h3><p>Workout, weight, profile and step records remain scoped to your authenticated account.</p></div></article></div><div className="settings-support-list"><button type="button" onClick={()=>openSupportPanel('help')}><span><strong>Help &amp; Support</strong><small>Get help using Steel</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('about')}><span><strong>About Steel</strong><small>Learn more about the app</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('feedback')}><span><strong>Send feedback</strong><small>Tell us how Steel can improve</small></span><ChevronRight size={17}/></button></div></section></div>
}

export default function AppV3({ user, onSignOut }) {
  const [tab, setTab] = useState(() => {
    const requested = window.location.hash.replace(/^#/, '')
    return [...tabs.map(({ id }) => id), 'Settings'].includes(requested) ? requested : 'Home'
  })
  const [settingsReturnTab, setSettingsReturnTab] = useState('Home')
  const [workouts, setWorkouts] = useState([])
  const [stats, setStats] = useState({ latestWeightLb: null, sessionCount: 0 })
  const [steps, setSteps] = useState({ steps: 0, source: null })
  const [stepHistory, setStepHistory] = useState([])
  const [weights, setWeights] = useState([])
  const [sessions, setSessions] = useState([])
  const [weeklyCheckin, setWeeklyCheckin] = useState(null)
  const [weeklyActivity, setWeeklyActivity] = useState({ workoutsCompleted: 0, nutritionDays: 0 })
  const [checkinMedia, setCheckinMedia] = useState([])
  const [weeklyCheckinHistory, setWeeklyCheckinHistory] = useState([])
  const [mediaBusy, setMediaBusy] = useState(false)
  const [profile, setProfile] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [workoutStartedAt, setWorkoutStartedAt] = useState(null)
  const [sessionNotes, setSessionNotes] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileEmail, setProfileEmail] = useState(user.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferences, setPreferences] = useState({ goal: 'Lose fat and gain muscle', experienceLevel: 'Intermediate', availableEquipment: ['Machines'], trainingDays: 3, units: 'lb', limitations: '', dietaryPreference: 'No preference', allergies: '', mealsPerDay: 3 })
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [progressOpen, setProgressOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [customLogOpen, setCustomLogOpen] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState(null)
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false)
  const [exerciseSwapMode, setExerciseSwapMode] = useState(false)
  const [removeConfirmId, setRemoveConfirmId] = useState(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [supportPanel, setSupportPanel] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSaved, setFeedbackSaved] = useState(false)

  useEffect(() => {
    function syncTabFromUrl() {
      const requested = window.location.hash.replace(/^#/, '')
      const next = [...tabs.map(({ id }) => id), 'Settings'].includes(requested) ? requested : 'Home'
      setTab(next)
      setMoreOpen(false)
      if (next !== 'Settings') setSettingsReturnTab(next)
    }
    if (!window.location.hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#Home`)
    window.addEventListener('popstate', syncTabFromUrl)
    window.addEventListener('hashchange', syncTabFromUrl)
    return () => { window.removeEventListener('popstate', syncTabFromUrl); window.removeEventListener('hashchange', syncTabFromUrl) }
  }, [])

  function navigateToTab(next, { replace = false } = {}) {
    const resolved = typeof next === 'function' ? next(tab) : next
    const valid = [...tabs.map(({ id }) => id), 'Settings'].includes(resolved) ? resolved : 'Home'
    setTab(valid)
    setMoreOpen(false)
    if (valid === 'Checkin') refreshWeeklyActivity()
    const url = `${window.location.pathname}${window.location.search}#${valid}`
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }

  function refreshWeeklyActivity() {
    const { start, end } = currentWeekBounds()
    getWeeklyActivitySummary(user.id, start, end).then(setWeeklyActivity).catch(() => {})
  }

  async function refresh() {
    const { start, end } = currentWeekBounds()
    const [programme, dashboard, todaySteps, stepHistoryRows, history, recent, profileRow, latestCheckin, activitySummary, checkinHistory] = await Promise.all([
      loadWorkouts(user.id), getDashboardStats(user.id), getTodaySteps(user.id),
      getStepHistory(user.id, 31),
      getWeightHistory(user.id, 30), getRecentSessions(user.id, 8), getProfile(user.id), getLatestWeeklyCheckin(user.id), getWeeklyActivitySummary(user.id, start, end), getWeeklyCheckinHistory(user.id),
    ])
    setWorkouts(programme); setStats(dashboard); setSteps(todaySteps); setStepHistory(stepHistoryRows); setWeights(history); setSessions(recent); setWeeklyCheckin(latestCheckin); setWeeklyCheckinHistory(checkinHistory); setWeeklyActivity(activitySummary); setProfile(profileRow)
    setPreferences({ goal: profileRow?.goal || 'Lose fat and gain muscle', experienceLevel: profileRow?.experience_level || 'Intermediate', availableEquipment: profileRow?.available_equipment?.length ? profileRow.available_equipment : ['Machines'], trainingDays: Number(profileRow?.training_days || 3), units: profileRow?.units || 'lb', limitations: profileRow?.limitations || '', dietaryPreference: profileRow?.dietary_preference || 'No preference', allergies: profileRow?.allergies || '', mealsPerDay: Number(profileRow?.meals_per_day || 3) })
    const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'
    setProfileName(profileRow?.display_name || fallbackName)
    setProfilePhone(profileRow?.phone || '')
    setProfileEmail(user.email || '')
    if (!selectedId && programme[0]) setSelectedId(programme[0].id)
  }

  useEffect(() => { let active = true; setBusy(true); setLoadError(''); refresh().catch((e) => { if (active) { setLoadError(e.message || 'Steel could not load your data.'); setMessage(e.message) } }).finally(() => active && setBusy(false)); return () => { active = false } }, [user.id])

  function retryAppLoad() {
    setBusy(true)
    setLoadError('')
    refresh().catch((e) => { setLoadError(e.message || 'Steel could not load your data.'); setMessage(e.message) }).finally(() => setBusy(false))
  }

  const selectedWorkout = useMemo(() => workouts.find((w) => w.id === selectedId) || workouts[0] || null, [workouts, selectedId])
  const activeExercises = selectedWorkout && draft ? selectedWorkout.exercises.filter((e) => !draft.removedExercises.includes(e.id)) : []
  const atFinisher = Boolean(draft && draft.step >= activeExercises.length)
  const currentExercise = draft && !atFinisher ? activeExercises[draft.step] : null
  const currentExerciseName = currentExercise?.name?.trim().toLowerCase()
  const firstName = (profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'there').split(' ')[0]
  const accountName = profile?.display_name || user.user_metadata?.full_name || firstName
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const latestWeight = stats.latestWeightLb ? Number(stats.latestWeightLb) : null
  const totalSteps = stepHistory.reduce((total, item) => total + Number(item.steps || 0), 0)
  const todaySteps = Number(steps.steps || 0)
  const previousWeight = weights.length > 1 ? Number(weights.at(-2).weight_lb) : null
  const weightDelta = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null
  const nextCheckinDate = weeklyCheckin?.submitted_at ? new Date(new Date(weeklyCheckin.submitted_at).getTime() + 7 * 86400000) : new Date(Date.now() + 7 * 86400000)

  function openSettings() { if (tab !== 'Settings') setSettingsReturnTab(tab); navigateToTab('Settings'); setMessage('') }
  function closeSettings() { navigateToTab(settingsReturnTab || 'Home'); setMessage('') }
  function openSupportPanel(panel) { setSupportPanel(panel); setFeedbackSaved(false); setMessage('') }
  function closeSupportPanel() { setSupportPanel(null); setFeedbackText(''); setFeedbackSaved(false) }
  function saveFeedback(event) {
    event.preventDefault()
    if (!feedbackText.trim()) return
    setFeedbackSaved(true)
    setFeedbackText('')
  }
  async function submitWeeklyCheckin(values) {
    const now = new Date()
    now.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    setSaving(true); setMessage('')
    try {
      const next = await saveWeeklyCheckinRecord({ userId: user.id, weekStart: now.toISOString().slice(0, 10), ...values })
      setWeeklyCheckin(next); setMessage('Weekly check-in saved.')
    } catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }
  async function submitCheckinMedia(file, mediaType = 'other') {
    const { start } = currentWeekBounds()
    setMediaBusy(true); setMessage('')
    try { const media = await uploadCheckinMedia({ userId: user.id, weekStart: start, file, mediaType }); setCheckinMedia((items) => [...items, media]); setMessage('Media attached to this check-in.') }
    catch (e) { setMessage(e.message) } finally { setMediaBusy(false) }
  }
  function openWorkout(workout) { setSelectedId(workout.id); setDraft(makeDraft(workout)); setWorkoutStartedAt(Date.now()); setSessionNotes(''); navigateToTab('Train'); setMessage('') }
  async function saveAndStartCustomWorkout(workout) {
    setSaving(true); setMessage('')
    try {
      const saved = await saveCustomWorkout({ userId: user.id, workout })
      const refreshed = await loadWorkouts(user.id)
      setWorkouts(refreshed)
      setCustomLogOpen(false)
      openWorkout(refreshed.find((item) => item.id === saved.id) || workout)
      setMessage('Workout saved — let’s train.')
    } catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }
  function editWorkout(workout) { setEditingWorkout(workout); setCustomLogOpen(true); navigateToTab('Plan'); setMessage('') }
  async function saveEditedWorkout(workout) {
    setSaving(true); setMessage('')
    try { await updateCustomWorkout({ userId: user.id, workout }); const refreshed = await loadWorkouts(user.id); setWorkouts(refreshed); setEditingWorkout(null); setCustomLogOpen(false); setMessage('Workout updated.') }
    catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }
  async function duplicateWorkout(workout) {
    setSaving(true); setMessage('')
    try { await saveCustomWorkout({ userId: user.id, workout: { ...workout, name: `${workout.name} copy` } }); setWorkouts(await loadWorkouts(user.id)); setMessage('Workout duplicated.') }
    catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }
  function changeWorkout(id) { const w = workouts.find((x) => x.id === id); if (w) { setSelectedId(id); setDraft(makeDraft(w)); setWorkoutStartedAt(Date.now()); setSessionNotes(''); setMessage(`${w.name} selected.`) } }
  function updateSet(exerciseId, setNo, patch) { setDraft((d) => ({ ...d, sets: { ...d.sets, [exerciseId]: d.sets[exerciseId].map((s) => s.setNo === setNo ? { ...s, ...patch } : s) } })) }
  function moveStep(step) { setDraft((d) => ({ ...d, step: Math.max(0, Math.min(step, activeExercises.length)) })) }
  function removeExercise(id) { setDraft((d) => ({ ...d, removedExercises: [...new Set([...d.removedExercises, id])], step: Math.min(d.step, activeExercises.length - 1) })) }
  function restoreExercise(id) { setDraft((d) => ({ ...d, removedExercises: d.removedExercises.filter((x) => x !== id) })) }
  function openExercisePicker() { setExerciseSwapMode(true); setRemoveConfirmId(null); navigateToTab('Plan'); setMessage('Choose any exercise to use in this session.') }
  function closeExerciseLibrary() { setExerciseSwapMode(false); navigateToTab('Train') }
  function addExerciseToSession(row) {
    if (!selectedWorkout || !draft) return
    const replacement = { id: row.id, source: 'catalog', programmeId: null, name: row.name, equipment: (row.equipment ?? []).join(' / ') || 'Gym', muscleGroup: row.primary_muscle_group ?? null, secondaryMuscleGroups: row.secondary_muscle_groups ?? [], movementPattern: row.movement_pattern ?? null, difficulty: row.difficulty ?? null, instructions: row.instructions ?? null, youtubeUrl: row.video_url ?? null, thumbnailUrl: row.thumbnail_url ?? null, sets: currentExercise?.sets ?? row.sets ?? 3, reps: currentExercise?.reps ?? row.reps ?? '8–12', restSeconds: currentExercise?.rest_seconds ?? null }
    if (currentExercise) {
      const oldId = currentExercise.id
      setWorkouts((items) => items.map((workout) => workout.id === selectedWorkout.id ? { ...workout, exercises: workout.exercises.map((exercise) => exercise.id === oldId ? replacement : exercise) } : workout))
      setDraft((value) => ({ ...value, sets: { ...value.sets, [replacement.id]: value.sets[oldId] ?? value.sets[replacement.id] }, removedExercises: value.removedExercises.filter((id) => id !== oldId) }))
    } else {
      const alreadyInSession = selectedWorkout.exercises.find((exercise) => exercise.id === row.id)
      setWorkouts((items) => items.map((workout) => workout.id === selectedWorkout.id ? { ...workout, exercises: alreadyInSession ? workout.exercises : [...workout.exercises, replacement] } : workout))
      setDraft((value) => ({ ...value, step: 0, sets: { ...value.sets, [replacement.id]: value.sets[replacement.id] ?? Array.from({ length: replacement.sets }, (_, index) => ({ setNo: index + 1, weight: 0, reps: 10, complete: false, removed: false })) }, removedExercises: value.removedExercises.filter((id) => id !== row.id) }))
    }
    setExerciseSwapMode(false); navigateToTab('Train'); setMessage(`${row.name} added for this session.`)
  }
  function confirmRemoveExercise() { if (currentExercise) { removeExercise(currentExercise.id); setRemoveConfirmId(null); setMessage('Exercise removed for this session. You can restore it before saving.') } }

  const completedSets = selectedWorkout && draft ? selectedWorkout.exercises.reduce((total, exercise) => total + (draft.sets[exercise.id] || []).filter((s) => s.complete && !s.removed).length, 0) : 0

  async function saveSession() {
    if (!selectedWorkout || !draft || !completedSets) return
    setSaving(true)
    try { const durationMin = workoutStartedAt ? Math.max(1, Math.round((Date.now() - workoutStartedAt) / 60000)) : 45; await saveWorkoutSession({ userId: user.id, workout: selectedWorkout, draft, durationMin, notes: sessionNotes.trim() }); await refresh(); setDraft(null); setWorkoutStartedAt(null); setSessionNotes(''); navigateToTab('Home'); setMessage(`Session saved — ${completedSets} sets logged.`) }
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
      const next = await saveProfile(user.id, { displayName: profileName.trim(), phone: profilePhone.trim(), goal: profile?.goal || 'Lose fat and gain muscle', avatarUrl })
      setProfile(next); setMessage(profileEmail.trim() !== user.email ? 'Profile saved. Check your new email address to confirm the email change.' : 'Profile saved.')
    } catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  async function savePersonalProfile(event) {
    event.preventDefault()
    const changingPassword = Boolean(currentPassword || newPassword || confirmPassword)
    if (changingPassword && (!currentPassword || !newPassword || !confirmPassword)) {
      setMessage('Complete all password fields to change your password.')
      return
    }
    if (changingPassword && newPassword.length < 6) {
      setMessage('Use at least 6 characters for your new password.')
      return
    }
    if (changingPassword && newPassword !== confirmPassword) {
      setMessage('New passwords do not match.')
      return
    }
    setSaving(true); setMessage('')
    try {
      await updateAccount({ displayName: profileName.trim(), email: profileEmail.trim() })
      const next = await saveProfile(user.id, { displayName: profileName.trim(), phone: profilePhone.trim(), goal: profile?.goal || 'Lose fat and gain muscle', avatarUrl })
      if (changingPassword) await changePassword({ email: user.email, currentPassword, newPassword })
      setProfile(next); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setMessage(profileEmail.trim() !== user.email ? 'Profile saved. Check your new email address to confirm the email change.' : changingPassword ? 'Profile and password updated.' : 'Profile saved.')
    } catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  async function savePassword(event) {
    event.preventDefault(); setSaving(true); setMessage('')
    if (newPassword.length < 6) { setSaving(false); setMessage('Use at least 6 characters for your new password.'); return }
    if (newPassword !== confirmPassword) { setSaving(false); setMessage('New passwords do not match.'); return }
    try { await changePassword({ email: user.email, currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('Password updated successfully.') }
    catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  async function savePreferences(event) {
    event.preventDefault(); setSaving(true); setMessage('')
    try {
      const next = await saveProfile(user.id, { displayName: profileName.trim(), avatarUrl, ...preferences, experienceLevel: preferences.experienceLevel, availableEquipment: preferences.availableEquipment, trainingDays: Number(preferences.trainingDays), mealsPerDay: Number(preferences.mealsPerDay), dietaryPreference: preferences.dietaryPreference, allergies: preferences.allergies, onboardingCompleted: true })
      setProfile(next); setMessage('Training preferences saved. Steel can use these for your personalised plan.')
    } catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  function toggleEquipment(item) {
    setPreferences((current) => {
      const selected = current.availableEquipment.includes(item)
      if (selected && current.availableEquipment.length === 1) return current
      return { ...current, availableEquipment: selected ? current.availableEquipment.filter((value) => value !== item) : [...current.availableEquipment, item] }
    })
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0]; if (!file) return
    setAvatarBusy(true); setMessage('')
    try { const url = await uploadAvatar(user.id, file); const next = await saveProfile(user.id, { displayName: profileName, goal: profile?.goal || 'Lose fat and gain muscle', avatarUrl: url }); setProfile(next); setMessage('Profile photo updated.') }
    catch (e) { setMessage(e.message) } finally { setAvatarBusy(false); event.target.value = '' }
  }

  if (busy) return <div className="v2-loading"><div className="steel-emblem"><SteelMark /></div><span>Loading Steel…</span></div>
  if (loadError) return <div className="v2-loading app-load-error"><div className="steel-emblem"><SteelMark /></div><div><span className="eyebrow">STEEL IS TEMPORARILY OFFLINE</span><h2>We couldn’t load your data</h2><p>Check your connection, then try again. Your account data is still safe.</p><button type="button" className="gold-button" onClick={retryAppLoad}>Try again</button></div></div>
  if (!profile?.onboarding_completed && !onboardingDismissed) return <OnboardingFlow preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} onComplete={savePreferences} onSkip={() => { setOnboardingDismissed(true); setMessage('You can finish your setup any time in Settings.') }} saving={saving} onSignOut={onSignOut} />

  return <div className="steel-app">
    <main className="steel-screen">
      <header className="v2-topbar">
        <div className="brand-lockup"><div className="brand-emblem"><SteelMark /></div><div><div className="eyebrow">SPARTAN STRENGTH, EVERY DAY</div><h1>PROJECT <span>STEEL</span></h1></div></div>
        <button className={`account-button ${tab === 'Settings' ? 'active' : ''}`} onClick={openSettings}><Avatar url={avatarUrl} size={32} /><span className="account-copy"><strong>{accountName}</strong><small>Profile</small></span><ChevronRight size={15} /></button>
      </header>
      {message && <div className="toast-note">{message}</div>}

      {tab === 'Train' && (!selectedWorkout || !draft) && <StartWorkoutChooser workouts={workouts} openWorkout={openWorkout} onBrowse={() => navigateToTab('Plan')} onCreateCustom={() => { setEditingWorkout(null); setCustomLogOpen(true); navigateToTab('Plan') }} />}

      {tab === 'Home' && <div className="page-stack home-page-stack">
        <section className="v4-welcome-card"><div className="v4-hero-art"><div className="v4-hero-figure" aria-hidden="true" /></div><div className="v4-hero-copy"><span className="eyebrow">WELCOME BACK,</span><h2>{firstName}</h2><p>You’ve got this. Let’s build something strong today.</p><button type="button" className="hero-checkin-reminder" onClick={() => navigateToTab('Checkin')}><ClipboardCheck size={14}/> Your next check-in is {formatDate(nextCheckinDate.toISOString())}</button></div><div className="v4-metric-grid"><article><Dumbbell size={17}/><span>WORKOUTS</span><strong>{stats.sessionCount}</strong><small>Logged</small></article><article><Flame size={17}/><span>STREAK</span><strong>{stats.streakDays || 0}</strong><small>Days</small></article><article><Footprints size={17}/><span>STEPS</span><strong>{todaySteps.toLocaleString('en-GB')}</strong><small>Today</small></article><button type="button" className="v4-metric-link" onClick={() => navigateToTab('Weight')}><Scale size={17}/><span>WEIGHT</span><strong>{latestWeight ? latestWeight.toFixed(1) : '—'}</strong><small>lb</small></button></div></section>
        <section className="v4-quick-actions"><div className="section-heading"><div><span className="eyebrow">MAKE IT EASY</span><h3>Quick actions</h3></div></div><div className="v4-action-grid">{workouts[0]&&<button onClick={()=>openWorkout(workouts[0])}><Play/><span>Start workout</span></button>}<button onClick={()=>navigateToTab('MealPlan')}><Salad/><span>Meal plan</span></button><button onClick={()=>navigateToTab('Weight')}><Scale/><span>Log weight</span></button><button onClick={()=>setProgressOpen(true)}><ListChecks/><span>View progress</span></button></div></section>
        <section className={`steel-card movement-card ${stepHistory.length ? '' : 'is-empty'}`}><div className="movement-card-heading"><div><span className="eyebrow">MOVEMENT HISTORY</span><h3>Steps total</h3><span className="metric-label">Last 30 days</span></div><div className="step-total"><strong>{totalSteps.toLocaleString('en-GB')}</strong><small>steps logged</small></div></div><div className="movement-card-meta"><span>Today <strong>{Number(steps.steps || 0).toLocaleString('en-GB')}</strong>{steps.source ? ` · synced from ${steps.source}` : ''}</span><button className="text-link" onClick={() => navigateToTab('Progress')}>View progress <ChevronRight size={14}/></button></div><StepsChart data={stepHistory}/>{!stepHistory.length&&<button className="movement-empty-link" onClick={openSettings}><Settings size={14}/> Connect health data in Settings</button>}</section>
        <section className="home-workout-section"><div className="section-heading"><div><span className="eyebrow">YOUR PROGRAMME</span><h3>Choose a workout</h3></div><button className="text-link" onClick={() => navigateToTab('Plan')}>View all</button></div><div className="workout-tile-stack">{workouts.map((w, i) => <button className="workout-tile" key={w.id} onClick={() => openWorkout(w)}><div className={`tile-art tile-art-${i+1}`}><Dumbbell size={30}/></div><div className="tile-copy"><span className="eyebrow">WORKOUT {i+1}</span><strong>{w.name}</strong><small>{w.exercises.length} exercises · {w.duration}</small></div><span className="tile-arrow"><ChevronRight size={19}/></span></button>)}</div></section>
      </div>}

      {tab === 'Plan' && (customLogOpen ? <LogWorkoutPage initialWorkout={editingWorkout} saving={saving} onCancel={() => { setEditingWorkout(null); setCustomLogOpen(false) }} onSave={editingWorkout ? saveEditedWorkout : null} onStart={saveAndStartCustomWorkout}/> : <PlanPage workouts={workouts} openWorkout={openWorkout} onLogWorkout={() => { setEditingWorkout(null); setCustomLogOpen(true) }} onEditWorkout={editWorkout} onDuplicateWorkout={duplicateWorkout} libraryMode={exerciseSwapMode} onSelectExercise={exerciseSwapMode ? addExerciseToSession : undefined} onCancelLibrary={closeExerciseLibrary}/>)}

{tab === 'Train' && <div className="page-stack training-page">{!selectedWorkout || !draft ? <section className="empty-state"><Dumbbell size={34}/><h2>Choose a workout</h2><p>Start from Home or Workouts.</p>{workouts[0]&&<button className="gold-button" onClick={()=>openWorkout(workouts[0])}>Start workout</button>}</section> : <><section className="train-top"><div><span className="eyebrow">ACTIVE WORKOUT</span><h2>{selectedWorkout.name}</h2></div><select value={selectedWorkout.id} onChange={(e)=>changeWorkout(e.target.value)}>{workouts.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></section><div className="train-progress-copy"><span>{atFinisher?'Final step':`Exercise ${draft.step+1} of ${activeExercises.length}`}</span><span>{Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%</span></div><div className="train-progress"><span style={{width:`${Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%`}}/></div>{!atFinisher&&currentExercise&&<><article className="exercise-focus-card"><div className="exercise-visual"><Dumbbell size={48}/><span>NOW</span></div><div className="exercise-focus-copy"><div className="exercise-focus-heading"><div><span className="eyebrow">CURRENT EXERCISE</span><h2>{currentExercise.name}</h2></div><span className="exercise-step-count">{draft.sets[currentExercise.id]?.filter((set) => set.complete && !set.removed).length || 0} / {currentExercise.sets}</span></div><p>{currentExercise.equipment} · {currentExercise.sets} sets × {currentExercise.reps}</p>{(currentExercise.muscleGroup||currentExercise.difficulty)&&<div className="exercise-metadata">{currentExercise.muscleGroup&&<span>{currentExercise.muscleGroup}</span>}{currentExercise.secondaryMuscleGroups?.slice(0,2).map(group=><span key={group}>{group}</span>)}{currentExercise.difficulty&&<span>{currentExercise.difficulty}</span>}</div>}{currentExercise.instructions&&<p className="exercise-instructions">{currentExercise.instructions}</p>}<div className="exercise-actions"><button type="button" className="exercise-action-button" onClick={openExercisePicker}><RotateCcw size={15}/> Change exercise</button>{currentExercise.youtubeUrl&&<a className="exercise-action-button exercise-video-link" href={currentExercise.youtubeUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Form video</a>}<button type="button" className="exercise-action-button exercise-remove-button" onClick={()=>setRemoveConfirmId(currentExercise.id)}><Trash2 size={15}/> Remove</button></div>{removeConfirmId===currentExercise.id&&<div className="exercise-remove-confirm"><span>Remove this exercise from today’s session?</span><div><button type="button" onClick={()=>setRemoveConfirmId(null)}>Keep it</button><button type="button" className="confirm-remove-button" onClick={confirmRemoveExercise}>Remove exercise</button></div></div>}</div></article><div className="set-list-v2">{(draft.sets[currentExercise.id]||[]).map(set=><article className={`set-row-v2 ${set.complete?'complete':''} ${set.removed?'removed':''}`} key={set.setNo}><div className="set-number">{set.setNo}</div>{!set.removed?<><label><span>KG</span><input type="number" min="0" step="2.5" value={set.weight} onChange={e=>updateSet(currentExercise.id,set.setNo,{weight:Number(e.target.value)||0})}/></label><label><span>REPS</span><input type="number" min="1" value={set.reps} onChange={e=>updateSet(currentExercise.id,set.setNo,{reps:Number(e.target.value)||1})}/></label><div className="set-actions-v2"><button className={set.complete?'done-button done':'done-button'} onClick={()=>updateSet(currentExercise.id,set.setNo,{complete:!set.complete})}><Check size={16}/> {set.complete?'Done':'Complete'}</button><button className="remove-button" onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:true,complete:false})}><Trash2 size={15}/> Remove</button></div></>:<div className="removed-copy"><span>Removed</span><button onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:false})}><RotateCcw size={15}/> Restore</button></div>}</article>)}</div><div className="train-nav-row"><button disabled={draft.step===0} onClick={()=>moveStep(draft.step-1)}><ArrowLeft size={17}/> Previous</button><button className="gold-button" onClick={()=>moveStep(draft.step+1)}>{draft.step===activeExercises.length-1?'Finisher':'Next'} <ArrowRight size={17}/></button></div></>}{atFinisher&&<><article className="finisher-panel"><div className="finisher-symbol"><Flame size={24}/></div><div><span className="eyebrow">FINISH STRONG</span><h2>Incline cardio</h2><p>7 min · 6% incline · RPE 6</p></div></article><article className="session-summary-v2"><div className="summary-hero"><Check size={20}/><div><span className="eyebrow">SESSION SUMMARY</span><strong>{completedSets} working sets</strong></div></div></article>{draft.removedExercises.length>0&&<details className="options-panel"><summary>Restore removed exercises</summary>{draft.removedExercises.map(id=>{const e=selectedWorkout.exercises.find(x=>x.id===id);return e?<button className="restore-exercise" key={id} onClick={()=>restoreExercise(id)}><RotateCcw size={14}/> {e.name}</button>:null})}</details>}<button type="button" className="gold-button add-exercise-from-session" onClick={openExercisePicker}><Dumbbell size={17}/> Add or change exercise</button><div className="train-nav-row"><button onClick={()=>moveStep(Math.max(activeExercises.length-1,0))}><ArrowLeft size={17}/> Back</button><button className="gold-button" disabled={!completedSets||saving} onClick={saveSession}><Save size={17}/> {saving?'Saving…':'Save session'}</button></div></>}</>}</div>}

      {tab === 'Train' && draft && atFinisher && <SessionNotesField value={sessionNotes} onChange={setSessionNotes} completedSets={completedSets}/>}
      {tab === 'Progress' && <ProgressPage stats={stats} sessions={sessions} weights={weights} stepHistory={stepHistory} totalSteps={totalSteps}/>}

      {tab === 'Checkin' && <WeeklyCheckinPage checkin={weeklyCheckin} activitySummary={weeklyActivity} mediaItems={checkinMedia} historyItems={weeklyCheckinHistory} onSave={submitWeeklyCheckin} onUploadMedia={submitCheckinMedia} saving={saving} mediaBusy={mediaBusy}/>}

      {tab === 'Weight' && <WeightPage latestWeight={latestWeight} weightDelta={weightDelta} weights={weights} weightInput={weightInput} setWeightInput={setWeightInput} submitWeight={submitWeight} saving={saving}/>}

      {tab === 'Settings' && <div className="page-stack settings-page"><button className="settings-back-button" type="button" onClick={closeSettings}><ArrowLeft size={17}/> Back</button><section className="page-intro"><span className="eyebrow">PROFILE & SETTINGS</span><h2>Your Steel profile</h2><p>Personalise your account and prepare health syncing.</p><button className="settings-support-jump" type="button" onClick={() => document.getElementById('settings-support')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span>Need help?</span><strong>Support &amp; feedback</strong><ChevronRight size={15}/></button></section><article className="settings-profile-card editable-profile"><div className="avatar-upload-wrap"><Avatar url={avatarUrl} size={72}/><label className="avatar-upload-button"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} disabled={avatarBusy}/></label></div><div><span className="eyebrow">DISPLAY PROFILE</span><h3>{accountName}</h3><p>{avatarBusy?'Uploading photo…':user.email}</p></div></article><form className="steel-card profile-form" onSubmit={saveAccount}><label><span>Name</span><input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></label><label><span>Email</span><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required/></label><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save profile'}</button></form><form className="steel-card password-form" onSubmit={savePassword}><div className="settings-form-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h3>Change password</h3></div><ShieldCheck size={20}/></div><p className="settings-form-copy">Use your current password to confirm this change.</p><label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label><label><span>New password</span><input type="password" autoComplete="new-password" minLength="6" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></label><label><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength="6" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label><button className="gold-button" disabled={saving}><ShieldCheck size={17}/> {saving?'Updating…':'Update password'}</button></form><article className="settings-security-card"><span className="settings-security-icon"><Watch size={22}/></span><div><span className="eyebrow">HEALTH & WATCH SYNC</span><h3>Step integrations planned</h3><p>Steel is prepared for daily step data. Next we can connect the appropriate native bridges for Apple Health, Android Health Connect/Google Fit-compatible apps, Samsung Health and supported watch ecosystems.</p></div></article><div className="health-provider-grid"><div className="health-provider"><strong>Apple Health</strong><span>iPhone + Apple Watch</span><small>Planned</small></div><div className="health-provider"><strong>Health Connect</strong><span>Android + compatible watches</span><small>Planned</small></div><div className="health-provider"><strong>Samsung Health</strong><span>Galaxy Watch ecosystem</span><small>Planned</small></div></div><article className="settings-security-card"><span className="settings-security-icon"><ShieldCheck size={22}/></span><div><span className="eyebrow">YOUR DATA</span><h3>Private by default</h3><p>Workout, weight, profile and step records remain scoped to your authenticated account.</p></div></article><section className="settings-support-card" id="settings-support"><div className="section-heading"><div><span className="eyebrow">NEED A HAND?</span><h3>Support</h3></div></div><div className="settings-support-list"><button type="button" onClick={()=>openSupportPanel('help')}><span><strong>Help &amp; Support</strong><small>Get help using Steel</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('about')}><span><strong>About Steel</strong><small>Learn more about the app</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('feedback')}><span><strong>Send feedback</strong><small>Tell us how Steel can improve</small></span><ChevronRight size={17}/></button></div></section><button className="signout-button" onClick={onSignOut}><LogOut size={18}/> Sign out of Project Steel</button></div>}
      {tab === 'MealPlan' && <NutritionPage userId={user.id} preferences={preferences} navigateToTab={navigateToTab}/>}
      {tab === 'Library' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">YOUR TRAINING</span><h2>Exercise library</h2><p>Browse every movement and open the form guidance before you train.</p></section><ExerciseLibrary/></div>}
      {tab === 'Settings' && <SettingsPage user={user} onSignOut={onSignOut} closeSettings={closeSettings} accountName={accountName} avatarUrl={avatarUrl} profileName={profileName} setProfileName={setProfileName} profileEmail={profileEmail} setProfileEmail={setProfileEmail} profilePhone={profilePhone} setProfilePhone={setProfilePhone} saveAccount={savePersonalProfile} handleAvatar={handleAvatar} avatarBusy={avatarBusy} currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} savePassword={savePassword} saving={saving} preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} savePreferences={savePreferences} openSupportPanel={openSupportPanel}/>}
      {supportPanel && <div className="support-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSupportPanel() }}><section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-dialog-title"><button className="support-dialog-close" type="button" aria-label="Close support panel" onClick={closeSupportPanel}>×</button>{supportPanel === 'help' && <><div className="support-dialog-icon"><HelpCircle size={22}/></div><span className="eyebrow">STEEL HELP</span><h2 id="support-dialog-title">Train with confidence</h2><p>Choose a workout from Home or Workouts, complete each set, then save the session at the end. Your logged sessions, weight and steps feed the Progress view.</p><div className="support-help-list"><div><strong>Can’t see your steps?</strong><span>Open Settings and connect a supported health provider when integrations are enabled.</span></div><div><strong>Need to change your plan?</strong><span>Start with your goal and equipment preferences; personalised journeys are coming next.</span></div><div><strong>Something went wrong?</strong><span>Refresh once, then check that you are signed in to the correct Steel account.</span></div></div></>}{supportPanel === 'about' && <><div className="support-dialog-icon"><Info size={22}/></div><span className="eyebrow">ABOUT PROJECT STEEL</span><h2 id="support-dialog-title">Your training homebase</h2><p>Project Steel is a private, mobile-first training space for workouts, progress, body-weight check-ins and daily movement.</p><div className="support-about-points"><span>Private account data protected by Supabase authentication and row-level security.</span><span>Spartan-inspired guidance designed to make consistent training feel clear and achievable.</span><span>AI trainer, meal planning and connected fitness journeys are part of the wider roadmap.</span></div></>}{supportPanel === 'feedback' && <><div className="support-dialog-icon"><MessageSquare size={22}/></div><span className="eyebrow">SHAPE THE NEXT RELEASE</span><h2 id="support-dialog-title">Send feedback</h2>{feedbackSaved ? <div className="support-feedback-success"><strong>Thanks — your feedback is captured for this session.</strong><button className="gold-button" type="button" onClick={() => setFeedbackSaved(false)}>Add more feedback</button></div> : <form className="support-feedback-form" onSubmit={saveFeedback}><label htmlFor="steel-feedback">What should Steel improve next?</label><textarea id="steel-feedback" value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} placeholder="Tell us what would make your next session easier…" rows="5" required/><button className="gold-button" type="submit" disabled={!feedbackText.trim()}>Save feedback</button></form>}</>}{supportPanel !== 'feedback' && <button className="gold-button support-dialog-action" type="button" onClick={closeSupportPanel}>Back to Settings</button>}</section></div>}
    </main>
    {moreOpen && <div className="more-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false) }}><section className="more-sheet" role="dialog" aria-modal="true" aria-labelledby="more-sheet-title"><div className="more-sheet-handle"/><div className="more-sheet-heading"><div><span className="eyebrow">PROJECT STEEL</span><h2 id="more-sheet-title">More</h2></div><button type="button" className="more-sheet-close" aria-label="Close more menu" onClick={() => setMoreOpen(false)}>×</button></div><div className="more-sheet-grid"><button onClick={() => navigateToTab('Plan')}><Dumbbell/><span>Workouts</span></button><button onClick={() => navigateToTab('Library')}><ListChecks/><span>Exercise library</span></button><button onClick={() => navigateToTab('Checkin')}><ClipboardCheck/><span>Weekly check-in</span></button><button onClick={() => navigateToTab('Recipes')}><Salad/><span>Recipes</span></button><button onClick={() => navigateToTab('Weight')}><Scale/><span>Weight</span></button><button onClick={openSettings}><Settings/><span>Settings</span></button></div></section></div>}
    <nav className="v2-bottom-nav" aria-label="Project Steel navigation">{mobileTabs.map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>navigateToTab(id)}><Icon size={20}/><span>{label}</span></button>)}<button className={moreOpen || !mobileTabs.some(({id})=>id===tab) ? 'active' : ''} aria-expanded={moreOpen} onClick={()=>setMoreOpen((open)=>!open)}><MoreHorizontal size={20}/><span>More</span></button></nav>
    <nav className="v4-desktop-nav" aria-label="Project Steel desktop navigation"><div className="v4-desktop-brand"><div className="brand-emblem"><SteelMark size={22}/></div><strong>PROJECT STEEL</strong></div>{tabs.filter(({id})=>id!=='Train').map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>navigateToTab(id)}><Icon size={20}/><span>{label}</span></button>)}<button className={tab==='Settings'?'active':''} onClick={openSettings}><Settings size={20}/><span>Settings</span></button><div className="v4-desktop-support"><span className="eyebrow">SUPPORT</span><button onClick={openSettings}>Help &amp; Support <ChevronRight size={15}/></button><button onClick={openSettings}>About Steel <ChevronRight size={15}/></button></div></nav>
  </div>
}
