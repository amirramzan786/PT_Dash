import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, Camera, Check, ChevronDown, ChevronRight, Dumbbell, ExternalLink, Flame,
  Footprints, HelpCircle, Home, Info, LineChart, LogOut, MessageSquare, MoreHorizontal, Play, RotateCcw, Salad, Save, Scale, Search, Settings,
  Send, ShieldCheck, Sparkles, Target, Trash2, UserRound, Watch, ListChecks, ClipboardCheck, X,
} from 'lucide-react'
import {
  changePassword, deleteMealLog, getDashboardStats, getLatestWeeklyCheckin, getMealLogs, getProfile, getRecentSessions, getTodaySteps, getStepHistory, getWeightHistory, getWeeklyCheckinHistory,
  getActiveGeneratedProgramme, getNutritionPlan, getProgrammeIntake, getWeeklyActivitySummary, loadExerciseCatalog, loadUserRole, loadWorkouts, replaceGeneratedProgramme, resetOnboarding, saveCustomWorkout, saveMealLog, saveMealPlanItem, saveNutritionFoodEntry, saveNutritionMealComponents, saveProgrammeIntake, saveProfile, saveWeight, saveWeeklyCheckin as saveWeeklyCheckinRecord, saveWorkoutSession, sendOnboardingAiMessage, updateAccount, updateCustomWorkout, uploadAvatar, uploadCheckinMedia,
} from './lib/steelApi'
import { buildGeneratedProgramme } from './lib/programmeGenerator'
import { buildDailySummary, buildTrainingRecommendation } from './lib/homeGuidance'
import './app-v2.css'
import './settings.css'
import './v3.css'
import SteelMark from './components/SteelMark'
import ManualSteps from './components/ManualSteps'
import HealthIntegrations from './components/HealthIntegrations'
import ReminderSettings, { useSteelReminders } from './components/ReminderSettings'
import FoodDiary from './components/FoodDiary'
import './recovery.css'

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
  { id: 'Plan', label: 'Train', icon: Dumbbell },
  { id: 'MealPlan', label: 'Fuel', icon: Salad },
  { id: 'Progress', label: 'Progress', icon: LineChart },
]

const experienceOptions = ['Beginner', 'Intermediate', 'Advanced']
const equipmentOptions = ['Machines', 'Dumbbells', 'Barbell', 'Cables', 'Bodyweight', 'Cardio']
const dietaryOptions = ['No preference', 'High protein', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal']
const checkinDays = [['Monday', 0], ['Tuesday', 1], ['Wednesday', 2], ['Thursday', 3], ['Friday', 4], ['Saturday', 5], ['Sunday', 6]]

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
    cardio: workout.cardio ? { complete: true, activity: workout.cardio.activity, minutes: workout.cardio.durationMin, incline: 0, rpe: Number.parseFloat(workout.cardio.rpe) || 6 } : null,
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

function normaliseEquipment(value) {
  return String(value || '').toLowerCase().replace(/s$/, '')
}

function buildPersonalisedJourney(workouts, preferences) {
  const generated = workouts.filter((workout) => workout.source === 'programme')
  if (generated.length) return { goal: preferences.goal || '', level: preferences.experienceLevel || 'Intermediate', days: generated.length, workouts: generated, hasEquipmentMatch: true, summary: generated[0]?.planSummary || null }
  const available = new Set((preferences.availableEquipment?.length ? preferences.availableEquipment : ['Machines']).map(normaliseEquipment))
  const goal = preferences.goal || ''
  const level = preferences.experienceLevel || 'Intermediate'
  const ranked = workouts.map((workout) => {
    const required = workout.equipment ?? []
    const equipmentFit = !required.length || required.every((item) => available.has(normaliseEquipment(item)))
    const goalFit = (workout.goalTags ?? []).some((tag) => tag.toLowerCase() === goal.toLowerCase())
    const levelFit = workout.difficulty === level
    return { workout, score: (equipmentFit ? 5 : -8) + (goalFit ? 4 : 0) + (levelFit ? 2 : 0), equipmentFit }
  }).sort((a, b) => b.score - a.score || a.workout.name.localeCompare(b.workout.name))
  const compatible = ranked.filter((item) => item.equipmentFit)
  const source = compatible.length ? compatible : ranked
  const days = Math.max(1, Math.min(7, Number(preferences.trainingDays) || 3))
  return { goal, level, days, workouts: source.slice(0, Math.min(days, source.length)).map((item) => item.workout), hasEquipmentMatch: compatible.length > 0, summary: null }
}

function PersonalisedJourneyCard({ workouts, preferences, navigateToTab, onStartWorkout }) {
  const journey = buildPersonalisedJourney(workouts, preferences)
  const isGeneratedPlan = workouts.some((workout) => workout.source === 'programme')
  const goalCopy = {
    'Lose fat and gain muscle': 'Build strength while keeping your weekly routine moving.',
    'Build muscle': 'Progressive strength work with enough volume to grow.',
    'Get stronger': 'Focused strength sessions with steady, repeatable progress.',
    'Improve fitness': 'A balanced mix of strength and conditioning for better capacity.',
    'Train consistently': 'Simple sessions designed to make showing up easier.'
  }[journey.goal] || 'A flexible starting point built around your current preferences.'
  return <details className="journey-card journey-card-collapsible"><summary><span><span className="eyebrow">YOUR STEEL JOURNEY</span><strong>{journey.goal}</strong></span><span className="journey-summary-label">{journey.workouts.length} sessions <ChevronDown size={17}/></span></summary><div className="journey-expanded"><div className="journey-card-header"><div><h3>Your current direction</h3><p>{journey.summary || goalCopy}</p></div><button type="button" className="text-link" onClick={() => navigateToTab('Settings')}>Review preferences <ChevronRight size={14}/></button></div><div className="journey-summary"><span><strong>{journey.days}</strong> training day{journey.days === 1 ? '' : 's'}</span><span><strong>{journey.level}</strong> level</span><span><strong>{journey.workouts.length}</strong> sessions ready</span></div><div className="journey-plan-list">{journey.workouts.map((workout, index) => <button type="button" key={workout.id} onClick={() => onStartWorkout(workout)}><span className="journey-day">DAY {index + 1}</span><span><strong>{workout.name}</strong><small>{workout.focus || 'Full-body strength'} · {workout.duration}</small></span><ChevronRight size={16}/></button>)}</div>{isGeneratedPlan && <small className="journey-protection-note"><ShieldCheck size={14}/> Your active plan stays stable while you train. Preference changes are saved for your next planned review.</small>}{!journey.hasEquipmentMatch && <small className="journey-note">No exact equipment match was found, so Steel is showing the closest available sessions.</small>}</div></details>
}

function HomeDirectionCard({ summary, recommendation, hasWorkout, onStartWorkout, onCheckin }) {
  return <section className="home-direction-card"><div className="home-direction-header"><div><span className="eyebrow">TODAY’S DIRECTION</span><h3>{summary.title}</h3><p>{summary.detail}</p></div><span className={`direction-mode direction-${recommendation.mode.toLowerCase()}`}>{recommendation.mode}</span></div><div className="home-direction-signal"><div><span className="eyebrow">STEEL SIGNAL</span><strong>{recommendation.title}</strong><p>{recommendation.detail}</p></div><div className="home-direction-evidence"><span>WHY</span><small>{recommendation.signals.join(' · ')}</small></div></div><div className="home-direction-actions">{hasWorkout && recommendation.mode !== 'RECOVER' && <button type="button" className="gold-button" onClick={onStartWorkout}><Play size={16}/> Start session</button>}<button type="button" className="text-link" onClick={onCheckin}><ClipboardCheck size={15}/> Update check-in</button></div></section>
}

function nextCheckinDate(checkinDay = 0, submittedAt) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  const today = (date.getDay() + 6) % 7
  let daysUntil = (Number(checkinDay) - today + 7) % 7
  const submitted = submittedAt ? new Date(submittedAt) : null
  if (daysUntil === 0 && submitted && submitted.toDateString() === date.toDateString()) daysUntil = 7
  date.setDate(date.getDate() + daysUntil)
  return date
}

function localDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function WeightChart({ data }) {
  if (!data.length) return <div className="empty-chart">Log your first weight to start the trend.</div>
  const values = data.map((item) => Number(item.weight_lb))
  const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1)
  const points = values.map((value, index) => `${data.length === 1 ? 50 : (index / (data.length - 1)) * 100},${88 - ((value - min) / range) * 68}`).join(' ')
  return <svg className="weight-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Body weight trend"><polyline className="chart-line" points={points} /></svg>
}

function StepsChart({ data }) {
  if (!data.length) return <div className="empty-chart">Add your first step total to start your movement history.</div>
  const values = data.map((item) => Number(item.steps || 0)); const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${data.length === 1 ? 50 : (index / (data.length - 1)) * 100},${88 - (value / max) * 68}`).join(' ')
  return <svg className="steps-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Steps over the last 30 days">{data.length === 1 ? <circle cx="50" cy={88 - (values[0] / max) * 68} r="2" fill="currentColor"/> : <polyline className="chart-line" points={points}/>}</svg>
}

function ProgressPage({ stats, sessions, weights, stepHistory, totalSteps }) {
  const latestWeight = weights.length ? Number(weights[weights.length - 1].weight_lb) : null
  const startingWeight = weights.length ? Number(weights[0].weight_lb) : null
  const weightChange = latestWeight !== null && startingWeight !== null && weights.length > 1 ? latestWeight - startingWeight : null
  const averageDuration = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + (Number(session.duration_min) || 0), 0) / sessions.length) : 0
  return <div className="page-stack progress-page"><section className="page-intro"><span className="eyebrow">PROGRESS</span><h2>Your momentum</h2><p>A clear view of consistency, training load, movement and body-weight trend.</p></section><section className="progress-stat-grid"><article className="steel-card"><Dumbbell size={19}/><span>WORKOUTS</span><strong>{stats.sessionCount}</strong><small>All time</small></article><article className="steel-card"><Flame size={19}/><span>STREAK</span><strong>{stats.streakDays || 0}</strong><small>Days active</small></article><article className="steel-card"><Activity size={19}/><span>VOLUME</span><strong>{Math.round(stats.volumeKg || 0).toLocaleString('en-GB')}</strong><small>kg this month</small></article><article className="steel-card"><Footprints size={19}/><span>STEPS</span><strong>{totalSteps.toLocaleString('en-GB')}</strong><small>Last 30 days</small></article></section><section className="progress-detail-grid"><article className="steel-card progress-detail-card"><div className="section-heading"><div><span className="eyebrow">TRAINING RHYTHM</span><h3>Recent consistency</h3></div><Target size={19}/></div><div className="progress-detail-values"><div><span>Recent sessions</span><strong>{sessions.length}</strong></div><div><span>Average duration</span><strong>{averageDuration || '—'}{averageDuration ? ' min' : ''}</strong></div><div><span>Latest session</span><strong>{stats.latestSession ? formatDate(stats.latestSession.session_date) : '—'}</strong></div></div></article><article className="steel-card progress-detail-card"><div className="section-heading"><div><span className="eyebrow">BODY WEIGHT</span><h3>Long-term trend</h3></div><Scale size={19}/></div><div className="progress-detail-values"><div><span>Current</span><strong>{latestWeight !== null ? `${latestWeight.toFixed(1)} lb` : '—'}</strong></div><div><span>Change</span><strong className={weightChange !== null && weightChange <= 0 ? 'positive' : ''}>{weightChange === null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lb`}</strong></div><div><span>Check-ins</span><strong>{weights.length}</strong></div></div></article></section><section className="progress-chart-grid"><article className="steel-card progress-chart-card"><div className="section-heading"><div><span className="eyebrow">WEIGHT TREND</span><h3>Body weight</h3></div><span className="chart-period">{weights.length ? `${weights.length} check-ins` : 'No data yet'}</span></div><WeightChart data={weights}/></article><article className="steel-card progress-chart-card"><div className="section-heading"><div><span className="eyebrow">MOVEMENT TREND</span><h3>Steps</h3></div><span className="chart-period">Last 30 days</span></div><StepsChart data={stepHistory}/></article></section><section className="steel-card"><div className="section-heading"><div><span className="eyebrow">RECENT SESSIONS</span><h3>Training history</h3></div><Dumbbell size={20}/></div>{sessions.length ? sessions.map((session) => <div className="history-row session-history" key={session.id}><div><strong>{session.workout_name}</strong><span>{formatDate(session.session_date)}{session.notes ? ` · ${session.notes}` : ''}</span></div><small>{session.duration_min || 45} min</small></div>) : <p className="muted-copy">Completed sessions will appear here.</p>}</section></div>
}

function WeightPage({ latestWeight, weightDelta, weights, weightInput, setWeightInput, submitWeight, saving }) {
  return <div className="page-stack weight-page"><section className="page-intro"><span className="eyebrow">WEIGHT</span><h2>Body weight</h2><p>Log a quick check-in and see your trend without digging through the app.</p></section><article className="weight-overview-card"><div><span className="eyebrow">CURRENT WEIGHT</span><strong>{latestWeight ? `${latestWeight.toFixed(1)} lb` : 'No check-in yet'}</strong><small>{weightDelta === null ? 'Your next check-in will start the comparison.' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} lb since your previous check-in`}</small></div><Scale size={30}/></article><form className="weight-entry-card" onSubmit={submitWeight}><div><span className="eyebrow">QUICK CHECK-IN</span><h3>How much do you weigh today?</h3><p>Your check-in updates the Home and Progress views.</p></div><div className="weight-entry-row"><label><input type="number" min="60" max="700" step=".1" inputMode="decimal" placeholder={latestWeight ? latestWeight.toFixed(1) : 'Enter weight'} value={weightInput} onChange={(event) => setWeightInput(event.target.value)} aria-label="Weight in pounds"/><span>lb</span></label><button className="gold-button" disabled={saving || !weightInput}><Save size={17}/>{saving ? 'Saving…' : 'Save check-in'}</button></div></form><section className="steel-card weight-history-card"><div className="section-heading"><div><span className="eyebrow">YOUR TREND</span><h3>Weight history</h3></div><span className="chart-period">{weights.length ? `${weights.length} check-ins` : 'Ready when you are'}</span></div><WeightChart data={weights}/>{weights.length ? <div className="weight-history-list">{[...weights].reverse().slice(0, 8).map((weight) => <div className="history-row" key={weight.id}><span>{formatDate(weight.checkin_date)}</span><strong>{Number(weight.weight_lb).toFixed(1)} lb</strong></div>)}</div> : <p className="muted-copy">Your check-ins will appear here as a simple trend.</p>}</section></div>
}

function WeeklyCheckinPage({ checkin, checkinDay, activitySummary, mediaItems, historyItems, onSave, onUploadMedia, saving, mediaBusy }) {
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
  return <div className="page-stack checkin-page"><section className="page-intro"><span className="eyebrow">WEEKLY CHECK-IN</span><h2>How did your week go?</h2><p>A quick reflection helps Steel spot what’s working and what needs adjusting.</p></section><section className="checkin-status-card"><div><span className="eyebrow">THIS WEEK</span><strong>{checkin ? 'Check-in ready to update' : 'Your first check-in'}</strong><span>{checkin ? 'Last submitted ' + formatDate(checkin.submitted_at) : 'Your activity totals are pulled in automatically.'}</span><small className="checkin-day-note">Preferred day: {checkinDays.find(([, value]) => value === Number(checkinDay))?.[0] || 'Monday'}</small></div><ClipboardCheck size={28}/></section><form className="checkin-form" onSubmit={(event) => { event.preventDefault(); onSave(form) }}><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">HOW YOU FEEL</span><h3>Rate your week</h3></div><Activity size={19}/></div><div className="checkin-rating-grid">{[['energy','Energy'],['sleep','Sleep quality'],['stress','Stress'],['soreness','Soreness']].map(([field,label]) => <label key={field}><span>{label}</span><select value={form[field]} onChange={(event) => update(field, Number(event.target.value))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div></section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">BODY DATA</span><h3>Measurements</h3></div><Scale size={19}/></div><p className="checkin-media-copy">Optional measurements help your PT give more useful feedback over time.</p><div className="checkin-measurement-grid">{[['weightLb','Weight','lb'],['waistCm','Waist','cm'],['chestBustCm','Chest / bust','cm'],['hipsCm','Hips','cm'],['armCm','Arm','cm'],['thighCm','Thigh','cm']].map(([field,label,unit]) => <label key={field}><span>{label} ({unit})</span><input type="number" min="0" step=".1" inputMode="decimal" placeholder="Optional" value={form[field]} onChange={(event) => update(field, event.target.value)}/></label>)}</div></section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">ADHERENCE</span><h3>What did you complete?</h3></div><Target size={19}/></div>{editingAdherence ? <><div className="checkin-adherence-grid"><label><span>Workouts completed</span><input type="number" min="0" max="14" value={form.workoutsCompleted} onChange={(event) => update('workoutsCompleted', Number(event.target.value))}/></label><label><span>Days nutrition was on track</span><input type="number" min="0" max="7" value={form.nutritionDays} onChange={(event) => update('nutritionDays', Number(event.target.value))}/></label></div><button type="button" className="checkin-edit-button" onClick={() => setEditingAdherence(false)}>Use activity totals</button></> : <div className="checkin-auto-values"><div><strong>{form.workoutsCompleted}</strong><span>completed workouts</span></div><div><strong>{form.nutritionDays}</strong><span>nutrition days on track</span></div><button type="button" className="checkin-edit-button" onClick={() => setEditingAdherence(true)}>Edit</button></div>}</section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">FORM FEEDBACK</span><h3>Progress photos and movement</h3></div><Camera size={19}/></div><div className="checkin-media-intro"><p className="checkin-media-copy">Add progress photos or an optional form video for your future PT. Maximum 25 MB per file.</p><details className="checkin-photo-guide"><summary>How to take progress photos</summary><div><strong>Keep it consistent</strong><span>Use good, even lighting, a plain background and the same camera distance each week.</span><span>Take relaxed front, side and back photos. Wear boxers, underwear or a sports bra — only what you feel comfortable submitting — so your shape is clear without revealing anything you do not consent to share.</span><span>Keep your full body in frame, ask someone to help if possible, and avoid filters or dramatic poses.</span></div></details></div><div className="checkin-upload-grid">{mediaSlots.map(([mediaType,label]) => { const attached = mediaItems?.find((item) => item.media_type === mediaType); return <label className={`checkin-upload-button ${mediaType === 'exercise_video' ? 'optional-upload' : ''}`} key={mediaType}><Camera size={16}/><span>{attached ? label + ' attached' : mediaBusy ? 'Uploading…' : mediaType === 'exercise_video' ? label + ' (optional)' : label}</span><input type="file" accept={mediaType === 'exercise_video' ? 'video/*' : 'image/*'} onChange={(event) => { if (event.target.files?.[0]) onUploadMedia(event.target.files[0], mediaType); event.target.value = '' }} disabled={mediaBusy}/></label> })}</div></section><section className="steel-card checkin-card"><div className="section-heading"><div><span className="eyebrow">CONTEXT</span><h3>Anything Steel should know?</h3></div><MessageSquare size={19}/></div><label className="checkin-full-field"><span>Pain, soreness or injury notes</span><textarea rows="2" value={form.painOrInjury} onChange={(event) => update('painOrInjury', event.target.value)} placeholder="Optional — tell us what to modify or avoid."/></label><label className="checkin-full-field"><span>Wins this week</span><textarea rows="3" value={form.wins} onChange={(event) => update('wins', event.target.value)} placeholder="What are you proud of?"/></label><label className="checkin-full-field"><span>Challenges or questions</span><textarea rows="3" value={form.challenges} onChange={(event) => update('challenges', event.target.value)} placeholder="Where did you get stuck, or what should Steel help with?"/></label><label className="checkin-full-field"><span>Message for your future PT</span><textarea rows="2" value={form.questions} onChange={(event) => update('questions', event.target.value)} placeholder="Optional — this will be ready for your future coaching dashboard."/></label></section><button className="gold-button checkin-submit" disabled={saving}><ClipboardCheck size={17}/>{saving ? 'Saving check-in…' : 'Submit weekly check-in'}</button></form><button type="button" className="checkin-history-link" onClick={() => setHistoryOpen((open) => !open)}>{historyOpen ? 'Hide check-in history' : 'View check-in history'} <ChevronRight size={14}/></button>{historyOpen && <section className="steel-card checkin-history"><div className="section-heading"><div><span className="eyebrow">YOUR HISTORY</span><h3>Previous check-ins</h3></div><ClipboardCheck size={19}/></div>{historyItems?.length ? historyItems.map((item) => <article className="checkin-history-row" key={item.id}><div><strong>{formatDate(item.week_start)}</strong><span>{item.workouts_completed || 0} workouts · {item.nutrition_days || 0} nutrition days</span></div><small>{item.weight_lb ? item.weight_lb + ' lb' : 'No weight'}</small></article>) : <p className="muted-copy">Your previous submissions will appear here.</p>}</section>}</div>
}

function Avatar({ url, size = 36 }) {
  return url ? <img className="profile-image" src={url} alt="Profile" style={{ width: size, height: size }} /> : <span className="account-avatar" style={{ width: size, height: size }}><UserRound size={Math.max(17, size * .45)} /></span>
}

function PreferencesForm({ preferences, setPreferences, toggleEquipment, onSubmit, saving }) {
  return <form className="steel-card preferences-form" onSubmit={onSubmit}><div className="settings-form-heading"><div><span className="eyebrow">TRAINING PREFERENCES</span><h3>Shape your Steel plan</h3></div><Target size={20}/></div><p className="settings-form-copy">These preferences give your future AI trainer the context to make better recommendations.</p><label><span>Primary goal</span><select value={preferences.goal} onChange={e=>setPreferences({...preferences, goal:e.target.value})}><option>Lose fat and gain muscle</option><option>Build muscle</option><option>Get stronger</option><option>Improve fitness</option><option>Train consistently</option></select></label><fieldset><legend>Experience level</legend><div className="preference-choice-grid">{experienceOptions.map(option=><button type="button" key={option} className={preferences.experienceLevel===option?'selected':''} aria-pressed={preferences.experienceLevel===option} onClick={()=>setPreferences({...preferences, experienceLevel:option})}>{option}</button>)}</div></fieldset><fieldset><legend>Available equipment</legend><div className="equipment-choice-grid">{equipmentOptions.map(option=><button type="button" key={option} className={preferences.availableEquipment.includes(option)?'selected':''} aria-pressed={preferences.availableEquipment.includes(option)} onClick={()=>toggleEquipment(option)}>{preferences.availableEquipment.includes(option)?'✓ ':''}{option}</button>)}</div><small className="field-hint">Select everything you can use. Keep at least one option selected.</small></fieldset><div className="preference-split"><label><span>Training days per week</span><select value={preferences.trainingDays} onChange={e=>setPreferences({...preferences, trainingDays:Number(e.target.value)})}>{[1,2,3,4,5,6,7].map(day=><option key={day} value={day}>{day} {day===1?'day':'days'}</option>)}</select></label><label><span>Weekly check-in day</span><select value={preferences.checkinDay} onChange={e=>setPreferences({...preferences, checkinDay:Number(e.target.value)})}>{checkinDays.map(([day,value])=><option key={day} value={value}>{day}</option>)}</select></label></div><label><span>Weight units</span><select value={preferences.units} onChange={e=>setPreferences({...preferences, units:e.target.value})}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label><label><span>Injuries, limitations or anything Steel should know</span><textarea value={preferences.limitations} onChange={e=>setPreferences({...preferences, limitations:e.target.value})} placeholder="Optional — for example, shoulder discomfort or a movement to avoid." rows="3"/></label><div className="settings-form-divider"><span className="eyebrow">MEAL PREFERENCES</span><strong>Give future meal plans the right guardrails.</strong></div><label><span>Dietary preference</span><select value={preferences.dietaryPreference} onChange={e=>setPreferences({...preferences, dietaryPreference:e.target.value})}>{dietaryOptions.map(option=><option key={option}>{option}</option>)}</select></label><div className="preference-split"><label><span>Preferred meals per day</span><select value={preferences.mealsPerDay} onChange={e=>setPreferences({...preferences, mealsPerDay:Number(e.target.value)})}>{[2,3,4,5,6].map(meals=><option key={meals} value={meals}>{meals} meals</option>)}</select></label><label><span>Allergies or intolerances</span><input value={preferences.allergies} onChange={e=>setPreferences({...preferences, allergies:e.target.value})} placeholder="Optional"/></label></div><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save preferences'}</button></form>
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

function mergeAiPreferences(preferences, profile) {
  const next = { ...preferences }
  if (profile?.goal) next.goal = profile.goal
  if (profile?.experienceLevel) next.experienceLevel = profile.experienceLevel
  if (profile?.availableEquipment?.length) next.availableEquipment = profile.availableEquipment
  if (Number(profile?.trainingDays) > 0) next.trainingDays = Number(profile.trainingDays)
  if (Number(profile?.checkinDay) >= 0) next.checkinDay = Number(profile.checkinDay)
  if (profile?.units) next.units = profile.units
  if (typeof profile?.limitations === 'string') next.limitations = profile.limitations
  if (profile?.dietaryPreference) next.dietaryPreference = profile.dietaryPreference
  if (typeof profile?.allergies === 'string') next.allergies = profile.allergies
  if (Number(profile?.mealsPerDay) > 0) next.mealsPerDay = Number(profile.mealsPerDay)
  return next
}

function OnboardingAiAssistant({ preferences, setPreferences }) {
  const [open, setOpen] = useState(false)
  const [consent, setConsent] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'I’m Atlas. Tell me what you want to achieve, and I’ll help shape your training and meal preferences one step at a time.', local: true }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [readyToConfirm, setReadyToConfirm] = useState(false)
  const suggestedPrompts = ['Help me choose a goal', 'Build around my schedule', 'Plan around my food preferences']

  async function sendMessage(event, suggestedText = '') {
    event?.preventDefault?.()
    const content = (suggestedText || input).trim()
    if (!content || busy || !consent) return
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setBusy(true)
    setError('')
    try {
      const result = await sendOnboardingAiMessage({
        conversationId,
        messages: nextMessages.filter((message) => !message.local).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        aiDataConsent: true,
      })
      setConversationId(result.conversationId || conversationId)
      setMessages((current) => [...current, { role: 'assistant', content: result.message }])
      setProfile(result.profile || null)
      setReadyToConfirm(Boolean(result.readyToConfirm))
    } catch (nextError) {
      setError(nextError.message || 'Atlas is unavailable. Continue with the guided questions for now.')
    } finally {
      setBusy(false)
    }
  }

  function applyAnswers() {
    const merged = mergeAiPreferences(preferences, profile)
    setPreferences(merged)
    setOpen(false)
  }

  return <>
    <button type="button" className={`ai-onboarding-launcher ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} aria-label={open ? 'Close Atlas' : 'Open Atlas'} aria-expanded={open}>
      {open ? <X size={22}/> : <><span className="ai-launcher-mark"><SteelMark size={22} title="Atlas"/></span><span>Ask Atlas</span></>}
    </button>
    {open && <aside className="ai-onboarding-panel" role="dialog" aria-modal="false" aria-label="Atlas onboarding assistant">
      <header><span className="ai-guide-mark"><SteelMark size={23} title="Atlas"/></span><div><span className="eyebrow">AI TRAINING &amp; NUTRITION COACH</span><strong>Atlas</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Close Atlas"><X size={18}/></button></header>
      {!chatStarted ? <div className="ai-consent-card">
        <div className="ai-consent-heading"><ShieldCheck size={19}/><strong>Choose what you share</strong></div>
        <p>Messages you send here are processed by Google Gemini to generate replies. Don’t include medical records or anything you don’t want sent to Google. You can use the normal questions instead.</p>
        <label><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>I understand and want to use the AI chat.</span></label>
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Gemini data terms <ExternalLink size={13}/></a>
        <button type="button" className="gold-button" disabled={!consent} onClick={() => setChatStarted(true)}><Sparkles size={16}/> Start AI chat</button>
      </div> : <>
        <div className="ai-chat-messages" aria-live="polite">
          {messages.map((message, index) => <div className={`ai-chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.content}</span></div>)}
          {busy && <div className="ai-chat-message assistant is-thinking"><span>Atlas is thinking…</span></div>}
        </div>
        {messages.length === 1 && <div className="ai-prompt-chips">{suggestedPrompts.map((prompt) => <button type="button" key={prompt} onClick={(event) => sendMessage(event, prompt)}>{prompt}</button>)}</div>}
        {error && <div className="ai-chat-error"><span>{error}</span><small>Your manual setup is still available.</small></div>}
        {profile && <section className="ai-answer-review"><span className="eyebrow">ANSWERS CAPTURED</span><div><strong>{profile.goal || 'Goal pending'}</strong><span>{profile.experienceLevel || 'Level pending'} · {profile.trainingDays || '—'} days · {profile.availableEquipment?.join(', ') || 'Equipment pending'}</span></div><button type="button" onClick={applyAnswers}>Use these answers in the form</button>{readyToConfirm && <small>Apply these answers, then finish the required setup questions.</small>}</section>}
        <form className="ai-chat-compose" onSubmit={sendMessage}><label className="sr-only" htmlFor="atlas-message">Message Atlas</label><textarea id="atlas-message" rows="2" maxLength="2000" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Atlas about your goal…"/><button type="submit" disabled={!input.trim() || busy} aria-label="Send message"><Send size={18}/></button></form>
        <small className="ai-chat-disclaimer">AI guidance can be wrong. Medical concerns need a qualified professional.</small>
      </>}
    </aside>}
  </>
}

const trainingStyleOptions = ['Strength focused', 'Build muscle', 'General fitness', 'Low impact', 'Athletic conditioning']

function OnboardingScheduleFields({ preferences, setPreferences, invalid = () => false }) {
  return <fieldset><legend>Session shape</legend><div className="preference-split"><label id="onboarding-session-length" className={invalid('session-length') ? 'onboarding-field-invalid' : ''}><span>Usual session length</span><select value={preferences.sessionDurationMin} onChange={(event) => setPreferences({ ...preferences, sessionDurationMin: Number(event.target.value) })}>{[20, 30, 45, 60, 75, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select>{invalid('session-length') && <small className="onboarding-field-error">Choose a session length.</small>}</label><label id="onboarding-training-location" className={invalid('training-location') ? 'onboarding-field-invalid' : ''}><span>Where do you train?</span><select value={preferences.trainingLocation} onChange={(event) => setPreferences({ ...preferences, trainingLocation: event.target.value })}>{['Gym', 'Home', 'Hybrid'].map((location) => <option key={location}>{location}</option>)}</select>{invalid('training-location') && <small className="onboarding-field-error">Choose where you train.</small>}</label></div><label><span>How many days are you training now?</span><select value={preferences.currentTrainingDays} onChange={(event) => setPreferences({ ...preferences, currentTrainingDays: event.target.value === '' ? '' : Number(event.target.value) })}><option value="">Prefer not to say</option>{[0,1,2,3,4,5,6,7].map((days) => <option key={days} value={days}>{days} day{days === 1 ? '' : 's'}</option>)}</select></label></fieldset>
}

function OnboardingTrainingContextFields({ preferences, setPreferences }) {
  const toggleStyle = (style) => setPreferences({ ...preferences, trainingStyles: preferences.trainingStyles.includes(style) ? preferences.trainingStyles.filter((item) => item !== style) : [...preferences.trainingStyles, style] })
  return <><fieldset><legend>What feels right for you?</legend><div className="equipment-choice-grid">{trainingStyleOptions.map((style) => <button type="button" key={style} className={preferences.trainingStyles.includes(style) ? 'selected' : ''} aria-pressed={preferences.trainingStyles.includes(style)} onClick={() => toggleStyle(style)}>{preferences.trainingStyles.includes(style) ? '✓ ' : ''}{style}</button>)}</div><small className="field-hint">Choose any styles you enjoy. Steel will use this alongside your goal, not replace it.</small></fieldset><div className="preference-split"><label><span>Daily activity</span><select value={preferences.dailyActivityLevel} onChange={(event) => setPreferences({ ...preferences, dailyActivityLevel: event.target.value })}><option value="">Prefer not to say</option>{['Mostly seated', 'Lightly active', 'Active job', 'Very active'].map((level) => <option key={level}>{level}</option>)}</select></label><label><span>Usual sleep quality</span><select value={preferences.sleepQuality} onChange={(event) => setPreferences({ ...preferences, sleepQuality: event.target.value === '' ? '' : Number(event.target.value) })}><option value="">Prefer not to say</option>{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label></div><div className="preference-split"><label><span>Cardio preference</span><select value={preferences.cardioPreference} onChange={(event) => setPreferences({ ...preferences, cardioPreference: event.target.value })}>{['No preference', 'Walking', 'Running', 'Cycling', 'Machines', 'Classes', 'Sports', 'None for now'].map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Cardio sessions per week</span><select value={preferences.cardioSessions} onChange={(event) => setPreferences({ ...preferences, cardioSessions: Number(event.target.value) })}>{[0,1,2,3,4,5,6,7].map((sessions) => <option key={sessions} value={sessions}>{sessions}</option>)}</select></label></div><label><span>Exercises you enjoy or want more of</span><textarea value={preferences.exercisePreferences} onChange={(event) => setPreferences({ ...preferences, exercisePreferences: event.target.value })} placeholder="Optional — for example, squats, machines, classes or outdoor training." rows="3"/></label><label><span>Exercises you dislike or want to avoid</span><textarea value={preferences.exerciseAvoidances} onChange={(event) => setPreferences({ ...preferences, exerciseAvoidances: event.target.value })} placeholder="Optional — this helps Steel avoid a plan you will not want to follow." rows="3"/></label></>
}

function OnboardingFoodContextFields({ preferences, setPreferences }) {
  return <><label><span>How much time do you usually have to cook?</span><select value={preferences.cookingTime} onChange={(event) => setPreferences({ ...preferences, cookingTime: event.target.value })}><option value="">Prefer not to say</option>{['Minimal', '15–30 minutes', '30–60 minutes', 'Enjoy cooking'].map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Foods or meals you genuinely enjoy</span><textarea value={preferences.preferredFoods} onChange={(event) => setPreferences({ ...preferences, preferredFoods: event.target.value })} placeholder="Optional — tell us cuisines, staple foods or meals you would be happy to repeat." rows="3"/><small className="field-hint">Steel will use this to offer practical meal choices rather than a rigid, generic menu.</small></label></>
}

function OnboardingFlow({ preferences, setPreferences, toggleEquipment, onComplete, saving, onSignOut }) {
  const [step, setStep] = useState(0)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const isLast = step === 3
  const requiredFields = [
    { key: 'goal', step: 0, valid: () => Boolean(preferences.goal) },
    { key: 'experience', step: 0, valid: () => Boolean(preferences.experienceLevel) },
    { key: 'timeframe', step: 0, valid: () => Number(preferences.goalTimeframeWeeks) > 0 },
    { key: 'equipment', step: 1, valid: () => preferences.availableEquipment.length > 0 },
    { key: 'training-days', step: 1, valid: () => Number(preferences.trainingDays) > 0 },
    { key: 'checkin-day', step: 1, valid: () => Number.isInteger(Number(preferences.checkinDay)) && Number(preferences.checkinDay) >= 0 && Number(preferences.checkinDay) <= 6 },
    { key: 'units', step: 1, valid: () => ['lb', 'kg'].includes(preferences.units) },
    { key: 'session-length', step: 1, valid: () => Number(preferences.sessionDurationMin) > 0 },
    { key: 'training-location', step: 1, valid: () => Boolean(preferences.trainingLocation) },
    { key: 'dietary-preference', step: 3, valid: () => Boolean(preferences.dietaryPreference) },
    { key: 'meals-per-day', step: 3, valid: () => Number(preferences.mealsPerDay) > 0 },
  ]
  const missingFields = validationAttempted ? requiredFields.filter((field) => !field.valid()) : []
  const invalid = (key) => missingFields.some((field) => field.key === key)

  function showMissingInformation() {
    const first = missingFields[0]
    if (!first) return
    setStep(first.step)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById(`onboarding-${first.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })))
  }

  function advance(event) {
    event.preventDefault()
    const missing = requiredFields.filter((field) => (isLast || field.step === step) && !field.valid())
    if (missing.length) { setValidationAttempted(true); return }
    setValidationAttempted(false)
    if (isLast) return onComplete()
    setStep((current) => current + 1)
  }

  return <main className="onboarding-shell">
    <section className="onboarding-card">
      <div className="onboarding-brand">
        <div className="brand-emblem"><SteelMark /></div>
        <div><span className="eyebrow">PROJECT STEEL</span><strong>BUILD YOUR BASE</strong></div>
      </div>
      <div className="onboarding-progress" role="progressbar" aria-valuemin="1" aria-valuemax="4" aria-valuenow={step + 1}>
        <span style={{ width: String(((step + 1) / 4) * 100) + '%' }}/>
      </div>
      <div className="onboarding-step-copy">
        <span className="eyebrow">STEP {step + 1} OF 4</span>
        {step === 0 && <><h1>What are you building toward?</h1><p>Tell Steel the outcome and timeframe that matter to you.</p></>}
        {step === 1 && <><h1>Make it fit your real week.</h1><p>Your schedule, session length and equipment determine the structure of the plan.</p></>}
        {step === 2 && <><h1>Tell us how you like to move.</h1><p>Preferences and recovery context help Steel make a plan you can actually sustain.</p></>}
        {step === 3 && <><h1>Let’s make food work for you.</h1><p>Practical food context will shape future meal choices around your life.</p></>}
      </div>

      <form className="onboarding-form" onSubmit={advance}>
        {step === 0 && <>
          <fieldset id="onboarding-goal" className={invalid('goal') ? 'onboarding-field-invalid' : ''}>
            <legend>Primary goal</legend>
            <div className="onboarding-option-list">
              {['Lose fat and gain muscle','Build muscle','Get stronger','Improve fitness','Train consistently'].map((option) => <button type="button" key={option} className={preferences.goal === option ? 'selected' : ''} aria-pressed={preferences.goal === option} onClick={() => setPreferences({ ...preferences, goal: option })}>{option}<ChevronRight size={17}/></button>)}
            </div>
            {invalid('goal') && <small className="onboarding-field-error">Choose the outcome you want to build toward.</small>}
          </fieldset>
          <fieldset id="onboarding-experience" className={invalid('experience') ? 'onboarding-field-invalid' : ''}>
            <legend>Experience level</legend>
            <div className="preference-choice-grid">
              {experienceOptions.map((option) => <button type="button" key={option} className={preferences.experienceLevel === option ? 'selected' : ''} aria-pressed={preferences.experienceLevel === option} onClick={() => setPreferences({ ...preferences, experienceLevel: option })}>{option}</button>)}
            </div>
            {invalid('experience') && <small className="onboarding-field-error">Choose your current experience level.</small>}
          </fieldset>
          <label id="onboarding-timeframe" className={invalid('timeframe') ? 'onboarding-field-invalid' : ''}><span>When would you like to feel meaningful progress?</span><select value={preferences.goalTimeframeWeeks} onChange={(event) => setPreferences({ ...preferences, goalTimeframeWeeks: Number(event.target.value) })}>{[[4, 'About a month'], [8, 'About two months'], [12, 'About three months'], [24, 'About six months'], [52, 'Over a year']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{invalid('timeframe') && <small className="onboarding-field-error">Select a progress timeframe.</small>}</label>
        </>}

        {step === 1 && <>
          <fieldset id="onboarding-equipment" className={invalid('equipment') ? 'onboarding-field-invalid' : ''}>
            <legend>Available equipment</legend>
            <div className="equipment-choice-grid">
              {equipmentOptions.map((option) => <button type="button" key={option} className={preferences.availableEquipment.includes(option) ? 'selected' : ''} aria-pressed={preferences.availableEquipment.includes(option)} onClick={() => toggleEquipment(option)}>{preferences.availableEquipment.includes(option) ? '✓ ' : ''}{option}</button>)}
            </div>
            <small className="field-hint">Select everything you can use. Keep at least one option selected.</small>{invalid('equipment') && <small className="onboarding-field-error">Select at least one type of equipment.</small>}
          </fieldset>
          <div className="preference-split">
            <label id="onboarding-training-days" className={invalid('training-days') ? 'onboarding-field-invalid' : ''}><span>Training days per week</span><select value={preferences.trainingDays} onChange={(event) => setPreferences({ ...preferences, trainingDays: Number(event.target.value) })}>{[1,2,3,4,5,6,7].map((day) => <option key={day} value={day}>{day} {day === 1 ? 'day' : 'days'}</option>)}</select>{invalid('training-days') && <small className="onboarding-field-error">Choose your training days.</small>}</label>
            <label id="onboarding-checkin-day" className={invalid('checkin-day') ? 'onboarding-field-invalid' : ''}><span>Weekly check-in day</span><select value={preferences.checkinDay} onChange={(event) => setPreferences({ ...preferences, checkinDay: Number(event.target.value) })}>{checkinDays.map(([day, value]) => <option key={day} value={value}>{day}</option>)}</select>{invalid('checkin-day') && <small className="onboarding-field-error">Choose a check-in day.</small>}</label>
          </div>
          <label id="onboarding-units" className={invalid('units') ? 'onboarding-field-invalid' : ''}><span>Weight units</span><select value={preferences.units} onChange={(event) => setPreferences({ ...preferences, units: event.target.value })}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select>{invalid('units') && <small className="onboarding-field-error">Choose pounds or kilograms.</small>}</label>
          <OnboardingScheduleFields preferences={preferences} setPreferences={setPreferences} invalid={invalid}/>
        </>}

        {step === 2 && <>
          <label><span>Injuries, limitations or anything Steel should know</span><textarea value={preferences.limitations} onChange={(event) => setPreferences({ ...preferences, limitations: event.target.value })} placeholder="Optional — for example, shoulder discomfort or a movement to avoid." rows="4"/><small className="field-hint">Steel is not medical advice. For an injury or condition, follow guidance from a qualified clinician.</small></label>
          <OnboardingTrainingContextFields preferences={preferences} setPreferences={setPreferences}/>
        </>}

        {step === 3 && <>
          <label id="onboarding-dietary-preference" className={invalid('dietary-preference') ? 'onboarding-field-invalid' : ''}><span>Dietary preference</span><select value={preferences.dietaryPreference} onChange={(event) => setPreferences({ ...preferences, dietaryPreference: event.target.value })}>{dietaryOptions.map((option) => <option key={option}>{option}</option>)}</select>{invalid('dietary-preference') && <small className="onboarding-field-error">Choose your dietary preference.</small>}</label>
          <label id="onboarding-meals-per-day" className={invalid('meals-per-day') ? 'onboarding-field-invalid' : ''}><span>Preferred meals per day</span><select value={preferences.mealsPerDay} onChange={(event) => setPreferences({ ...preferences, mealsPerDay: Number(event.target.value) })}>{[2,3,4,5,6].map((meals) => <option key={meals} value={meals}>{meals} meals</option>)}</select>{invalid('meals-per-day') && <small className="onboarding-field-error">Choose the number of meals you prefer.</small>}</label>
          <label><span>Allergies or intolerances</span><textarea value={preferences.allergies} onChange={(event) => setPreferences({ ...preferences, allergies: event.target.value })} placeholder="Optional — for example, nuts, lactose or gluten." rows="3"/><small className="field-hint">You can update this later in Settings.</small></label>
          <OnboardingFoodContextFields preferences={preferences} setPreferences={setPreferences}/>
        </>}

        <div className="onboarding-actions">
          <button type="button" className="text-button" onClick={step === 0 ? onSignOut : () => setStep((current) => current - 1)}>{step === 0 ? 'Sign out' : 'Back'}</button>
          <button className="gold-button" disabled={saving}>{isLast ? (saving ? 'Building your plan…' : 'Finish setup') : <><span>Continue</span><ArrowRight size={17}/></>}</button>
        </div>
        {isLast && missingFields.length > 0 && <div className="onboarding-missing-panel" role="alert"><strong>Finish setup needs {missingFields.length} more answer{missingFields.length === 1 ? '' : 's'}.</strong><button type="button" onClick={showMissingInformation}>Show me missing information</button></div>}
      </form>
    </section>
    <OnboardingAiAssistant preferences={preferences} setPreferences={setPreferences}/>
  </main>
}


function mealComponentFromFood(food, grams, servingLabel) {
  return { foodId: food.id, name: food.name, brand: food.brand || '', grams: Number(grams), servingLabel: servingLabel || `${grams}g`, caloriesPer100: Number(food.calories_per_100g || 0), proteinPer100: Number(food.protein_g_per_100g || 0), carbsPer100: Number(food.carbs_g_per_100g || 0), fatPer100: Number(food.fat_g_per_100g || 0), fibrePer100: Number(food.fibre_g_per_100g || 0), sugarPer100: Number(food.sugar_g_per_100g || 0), saltPer100: Number(food.salt_g_per_100g || 0) }
}
function componentTotals(components) {
  return (components || []).reduce((total, component) => { const factor = Number(component.grams || 0) / 100; return { calories: total.calories + Number(component.caloriesPer100 || 0) * factor, protein: total.protein + Number(component.proteinPer100 || 0) * factor, carbs: total.carbs + Number(component.carbsPer100 || 0) * factor, fat: total.fat + Number(component.fatPer100 || 0) * factor, servingG: total.servingG + Number(component.grams || 0) } }, { calories: 0, protein: 0, carbs: 0, fat: 0, servingG: 0 })
}
function ingredientLabel(ingredient) { return typeof ingredient === 'string' ? ingredient : `${Math.round(Number(ingredient.grams || 0))}g ${ingredient.name || 'Catalogue food'}` }
function TodayMealPlan({ mealOrder, recipes, selectedChoices, setSelectedChoices, portions, setPortions, plannedLogs, logBusy, onEdit, onLog, onUnlog, onFindFood }) {
  return <section className="today-meal-plan"><div className="section-heading"><div><span className="eyebrow">YOUR MEALS FOR TODAY</span><h3>Choose. Adjust. Log.</h3></div><span className="nutrition-progress">3 options per meal</span></div>{mealOrder.map((meal) => { const options = recipes.filter((recipe) => recipe.meal === meal); const selected = options.find((recipe) => recipe.optionKey === selectedChoices[meal]) || options[0]; const portion = Number(portions[meal] || 1); const existing = plannedLogs.find((entry) => entry.meal_type === meal); return <article className={existing ? 'today-meal-card is-logged' : 'today-meal-card'} key={meal}><div className="today-meal-heading"><span className="eyebrow">{meal}</span>{existing && <span className="meal-logged-label">LOGGED</span>}</div><div className="today-meal-options">{options.map((option) => <button type="button" key={option.optionKey} className={selected.optionKey === option.optionKey ? 'selected' : ''} onClick={() => setSelectedChoices({ ...selectedChoices, [meal]: option.optionKey })}><strong>{option.name}</strong><span>{option.detail}</span><em>{option.calories} kcal · {option.protein}g protein</em></button>)}</div><div className="today-meal-selected"><div><strong>{selected.name}</strong><small>{(selected.ingredients || []).map(ingredientLabel).join(' · ')}</small></div><label><span>Portion</span><select value={portion} onChange={(event) => setPortions({ ...portions, [meal]: Number(event.target.value) })}>{[[.5,'½'],[.75,'¾'],[1,'Full'],[1.25,'1¼'],[1.5,'1½']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="today-meal-macros"><span>{Math.round(selected.calories * portion)} kcal</span><span>{Math.round(selected.protein * portion)}g protein</span><span>{Math.round(selected.carbs * portion)}g carbs</span><span>{Math.round(selected.fat * portion)}g fat</span></div><div className="today-meal-actions"><button type="button" onClick={() => onEdit(selected)}>Edit ingredients</button><button type="button" onClick={() => onFindFood(meal)}><Search size={15}/> Add food</button>{existing ? <button type="button" className="today-meal-unlog" disabled={logBusy} onClick={() => onUnlog(existing)}>Unlog</button> : <button type="button" className="gold-button" disabled={logBusy} onClick={() => onLog(selected)}>Log meal</button>}</div></article> })}</section>
}
function NutritionPage({ preferences, navigateToTab, userId }) {
  const [nutritionView, setNutritionView] = useState('plan')
  const [diaryMeal, setDiaryMeal] = useState('BREAKFAST')
  const [loggedMeals, setLoggedMeals] = useState([])
  const [openMeal, setOpenMeal] = useState(null)
  const [selectedChoices, setSelectedChoices] = useState({})
  const [portions, setPortions] = useState({})
  const [customOpen, setCustomOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [editingComponents, setEditingComponents] = useState([])
  const [matchingComponentIndex, setMatchingComponentIndex] = useState(null)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [finderOpen, setFinderOpen] = useState(false)
  const [finderMeal, setFinderMeal] = useState('BREAKFAST')
  const [editingCustomGroup, setEditingCustomGroup] = useState(null)
  const [customForm, setCustomForm] = useState({ meal: 'SNACK', title: '', items: [{ name: '', grams: '', caloriesPer100: '', proteinPer100: '', carbsPer100: '', fatPer100: '' }] })
  const [logBusy, setLogBusy] = useState(false)
  const starterChoices = {
    BREAKFAST: [
      { name: 'Protein power bowl', detail: 'Greek yoghurt · oats · berries · seeds', calories: 420, protein: 32, carbs: 48, fat: 12, servingG: 410, ingredients: ['250g Greek yoghurt', '50g oats', '100g berries', '10g mixed seeds'], instructions: 'Stir the yoghurt and oats together, top with berries and seeds, then chill for 5 minutes.' },
      { name: 'Eggs, toast & avocado', detail: 'Eggs · sourdough · avocado · tomatoes', calories: 430, protein: 30, carbs: 40, fat: 18, servingG: 360, ingredients: ['3 eggs', '2 slices sourdough', '50g avocado', '100g tomatoes'], instructions: 'Cook the eggs your preferred way, toast the sourdough and finish with sliced avocado and tomatoes.' },
      { name: 'Berry protein overnight oats', detail: 'Oats · whey · milk · berries', calories: 415, protein: 34, carbs: 50, fat: 10, servingG: 390, ingredients: ['50g oats', '25g protein powder', '180ml milk', '100g berries'], instructions: 'Mix everything in a jar, refrigerate overnight and stir before eating.' },
    ],
    LUNCH: [
      { name: 'Steel chicken bowl', detail: 'Chicken · rice · greens · salsa', calories: 580, protein: 48, carbs: 58, fat: 16, servingG: 520, ingredients: ['150g chicken breast', '120g cooked rice', '2 handfuls greens', '2 tbsp tomato salsa'], instructions: 'Season and cook the chicken through, warm the rice, then assemble with greens and salsa.' },
      { name: 'Turkey pesto wrap', detail: 'Turkey · wrap · pesto · salad', calories: 565, protein: 46, carbs: 56, fat: 18, servingG: 430, ingredients: ['150g turkey breast', '1 wholemeal wrap', '15g pesto', 'mixed salad'], instructions: 'Warm the wrap, layer in cooked turkey, pesto and salad, then roll tightly.' },
      { name: 'Tuna jacket potato', detail: 'Tuna · potato · yoghurt · salad', calories: 575, protein: 45, carbs: 60, fat: 15, servingG: 560, ingredients: ['1 large baked potato', '1 tin tuna', '40g Greek yoghurt', 'mixed salad'], instructions: 'Bake the potato, mix tuna with yoghurt, then fill and serve with salad.' },
    ],
    DINNER: [
      { name: 'Salmon & roasted vegetables', detail: 'Salmon · potatoes · seasonal greens', calories: 640, protein: 44, carbs: 52, fat: 24, servingG: 560, ingredients: ['150g salmon fillet', '200g baby potatoes', '200g seasonal vegetables', '1 tsp olive oil'], instructions: 'Roast the potatoes and vegetables at 200°C, add the salmon for the final 12–15 minutes, and serve.' },
      { name: 'Lean beef pasta', detail: 'Lean beef · pasta · tomato sauce', calories: 635, protein: 48, carbs: 66, fat: 18, servingG: 510, ingredients: ['150g 5% beef mince', '75g dry pasta', '150g tomato sauce', 'spinach'], instructions: 'Brown the mince, simmer with sauce and spinach, then toss through cooked pasta.' },
      { name: 'Chicken stir-fry noodles', detail: 'Chicken · noodles · veg · sesame', calories: 625, protein: 46, carbs: 64, fat: 18, servingG: 530, ingredients: ['150g chicken breast', '150g cooked noodles', '250g stir-fry vegetables', '1 tsp sesame oil'], instructions: 'Stir-fry chicken and vegetables, add noodles and finish with the sesame oil.' },
    ],
    SNACK: [
      { name: 'Cocoa protein oats', detail: 'Oats · milk · banana · protein', calories: 360, protein: 28, carbs: 46, fat: 8, servingG: 350, ingredients: ['40g oats', '200ml milk', '1 small banana', '25g protein powder', '1 tsp cocoa'], instructions: 'Simmer oats with milk, stir through protein powder and cocoa off the heat, then finish with banana.' },
      { name: 'Yoghurt & fruit crunch', detail: 'Greek yoghurt · granola · fruit', calories: 355, protein: 30, carbs: 42, fat: 9, servingG: 300, ingredients: ['250g Greek yoghurt', '35g granola', '1 kiwi', '100g berries'], instructions: 'Layer yoghurt, fruit and granola in a bowl just before eating.' },
      { name: 'Peanut protein smoothie', detail: 'Protein · banana · peanut butter · milk', calories: 365, protein: 31, carbs: 40, fat: 11, servingG: 420, ingredients: ['25g protein powder', '1 banana', '10g peanut butter', '250ml milk'], instructions: 'Blend all ingredients with ice until smooth.' },
    ],
  }
  const [recipes, setRecipes] = useState(() => Object.entries(starterChoices).flatMap(([meal, options]) => options.map((option, index) => ({ ...option, meal, optionKey: `${meal.toLowerCase()}-${index + 1}`, optionNumber: index + 1 }))))
  const [target, setTarget] = useState({ calories: 2050, protein_g: 170 })
  const [planBusy, setPlanBusy] = useState(true)
  const [planError, setPlanError] = useState('')

  function normalisePlan(meals) {
    const mapped = meals.map((meal) => ({ id: meal.id, meal: (meal.meal_type || 'MEAL').toUpperCase(), optionKey: meal.option_key || 'primary', optionNumber: meal.option_number || 1, name: meal.title, detail: meal.description || 'Assigned recipe details', calories: meal.calories || 0, protein: meal.protein_g || 0, carbs: meal.carbs_g || 0, fat: meal.fat_g || 0, servingG: meal.serving_g || 0, ingredients: Array.isArray(meal.ingredients) && meal.ingredients.length ? meal.ingredients : (meal.description ? [meal.description] : []), instructions: meal.instructions || 'Follow the preparation notes supplied with this assigned meal.' }))
    mapped.forEach((item) => { item.ingredients = item.ingredients.map((ingredient) => typeof ingredient === 'string' ? ingredient : { ...ingredient, toString() { return ingredientLabel(this) } }) })
    return Object.entries(starterChoices).flatMap(([meal, options]) => options.map((fallback, index) => {
      const matched = mapped.find((item) => item.meal === meal && (item.optionNumber === index + 1 || (index === 0 && item.optionKey === 'primary')))
      return matched || { ...fallback, meal, optionKey: `${meal.toLowerCase()}-${index + 1}`, optionNumber: index + 1 }
    }))
  }

  function openRecipeEditor(recipe) {
    setEditingRecipe(recipe)
    setMatchingComponentIndex(null)
    setEditingComponents((recipe.ingredients || []).map((ingredient, index) => typeof ingredient === 'string' ? { blueprint: true, name: ingredient.replace(/^\s*[\d.]+\s*(g|ml)?\s*/i, ''), grams: Number((ingredient.match(/[\d.]+/) || [100])[0]), key: `blueprint-${index}` } : { ...ingredient, key: ingredient.key || ingredient.foodId || `component-${index}` }))
  }
  function updateEditingComponent(index, patch) { setEditingComponents((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function receiveCatalogueFood({ food, grams, servingLabel }) {
    const component = { ...mealComponentFromFood(food, grams, servingLabel), key: food.id }
    setEditingComponents((items) => matchingComponentIndex === null || matchingComponentIndex < 0 ? [...items, component] : items.map((item, index) => index === matchingComponentIndex ? component : item))
    setMatchingComponentIndex(null)
  }
  async function saveEditedRecipe() {
    if (!editingRecipe) return
    setSavingRecipe(true)
    try {
      const allCatalogueFoods = editingComponents.length > 0 && editingComponents.every((item) => item.foodId)
      const totals = componentTotals(editingComponents)
      const next = { ...editingRecipe, ingredients: editingComponents.map(({ key, ...item }) => item), ...(allCatalogueFoods ? totals : {}) }
      const saved = await saveMealPlanItem({ userId, item: next })
      const normalised = normalisePlan([saved]).find((item) => item.meal === next.meal && item.optionNumber === next.optionNumber) || next
      setRecipes((items) => items.map((item) => item.meal === next.meal && item.optionNumber === next.optionNumber ? normalised : item))
      setEditingRecipe(null)
    } finally { setSavingRecipe(false) }
  }

  async function loadPlan() {
    setPlanBusy(true)
    setPlanError('')
    try {
      const plan = await getNutritionPlan(userId)
      if (plan.target) setTarget({ calories: plan.target.calories || 2050, protein_g: plan.target.protein_g || 170 })
      const seeded = plan.meals.length ? plan.meals : await Promise.all(Object.entries(starterChoices).flatMap(([meal, options]) => options.map((option, index) => saveMealPlanItem({ userId, item: { ...option, meal, optionKey: `${meal.toLowerCase()}-${index + 1}`, optionNumber: index + 1, sortOrder: index + 1 } }))))
      setRecipes(normalisePlan(seeded))
    } catch (error) {
      setPlanError(error.message || 'Your assigned recipes could not be loaded.')
    } finally {
      setPlanBusy(false)
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  async function refreshLoggedMeals() {
    const rows = await getMealLogs(userId, today, today)
    setLoggedMeals(rows)
  }
  useEffect(() => { loadPlan(); refreshLoggedMeals().catch(() => {}) }, [userId])
  async function logMeal(recipe) {
    const multiplier = Number(portions[recipe.meal] || 1)
    const existing = loggedMeals.find((row) => row.meal_type === recipe.meal && row.entry_type !== 'custom')
    const catalogueComponents = (recipe.ingredients || []).filter((item) => typeof item === 'object' && item.foodId)
    if (!existing && catalogueComponents.length && catalogueComponents.length === (recipe.ingredients || []).length) {
      setLogBusy(true)
      try { await saveNutritionMealComponents({ mealDate: today, mealType: recipe.meal, recipeName: recipe.name, items: catalogueComponents.map((item) => ({ ...item, grams: Math.round(Number(item.grams || 0) * multiplier) })) }); await refreshLoggedMeals(); return } finally { setLogBusy(false) }
    }
    const draft = { id: existing?.id || `draft-${recipe.meal}`, meal_date: today, meal_type: recipe.meal, meal_plan_item_id: recipe.id || null, entry_type: 'planned', recipe_name: recipe.name, calories: Math.round(recipe.calories * multiplier), protein_g: Math.round(recipe.protein * multiplier), carbs_g: Math.round(recipe.carbs * multiplier), fat_g: Math.round(recipe.fat * multiplier), serving_g: Math.round(recipe.servingG * multiplier), portion_multiplier: multiplier }
    setLogBusy(true)
    setLoggedMeals((current) => existing ? current.map((row) => row.id === existing.id ? draft : row) : [...current, draft])
    try {
      const saved = await saveMealLog({ id: existing?.id, userId, mealDate: today, mealType: recipe.meal, mealPlanItemId: recipe.id, entryType: 'planned', recipeName: recipe.name, calories: draft.calories, protein: draft.protein_g, carbs: draft.carbs_g, fat: draft.fat_g, servingG: draft.serving_g, portionMultiplier: multiplier })
      setLoggedMeals((current) => existing ? current.map((row) => row.id === existing.id ? saved : row) : current.map((row) => row.id === draft.id ? saved : row))
    } catch (error) {
      setLoggedMeals((current) => existing ? current.map((row) => row.id === draft.id ? existing : row) : current.filter((row) => row.id !== draft.id))
    } finally {
      setLogBusy(false)
    }
  }
  async function removeMeal(log) {
    setLogBusy(true)
    setLoggedMeals((current) => current.filter((row) => row.id !== log.id))
    try { await deleteMealLog({ userId, id: log.id }) } catch { setLoggedMeals((current) => [...current, log]) } finally { setLogBusy(false) }
  }
  async function removeMealGroup(logs) {
    setLogBusy(true)
    const ids = new Set(logs.map((log) => log.id))
    setLoggedMeals((current) => current.filter((row) => !ids.has(row.id)))
    try { await Promise.all(logs.map((log) => deleteMealLog({ userId, id: log.id }))) } catch { setLoggedMeals((current) => [...current, ...logs]) } finally { setLogBusy(false) }
  }
  function blankCustomItem() { return { name: '', grams: '', caloriesPer100: '', proteinPer100: '', carbsPer100: '', fatPer100: '' } }
  function calculatedCustomItem(item) {
    const multiplier = (Number(item.grams) || 0) / 100
    return { calories: Math.round((Number(item.caloriesPer100) || 0) * multiplier), protein: Math.round((Number(item.proteinPer100) || 0) * multiplier), carbs: Math.round((Number(item.carbsPer100) || 0) * multiplier), fat: Math.round((Number(item.fatPer100) || 0) * multiplier) }
  }
  function updateCustomItem(index, field, value) {
    setCustomForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }))
  }
  function addCustomItem() {
    setCustomForm((current) => ({ ...current, items: [...current.items, blankCustomItem()] }))
  }
  function removeCustomItem(index) {
    setCustomForm((current) => ({ ...current, items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index) }))
  }
  async function addCustomMeal(event) {
    event.preventDefault()
    const items = customForm.items.filter((item) => item.name.trim() && Number(item.grams) > 0 && Number(item.caloriesPer100) >= 0)
    if (!items.length) return
    const mealTitle = customForm.title.trim() || 'Custom meal'
    const draft = items.map((item, index) => {
      const calculated = calculatedCustomItem(item)
      return { id: item.sourceLogId || `draft-custom-${Date.now()}-${index}`, meal_date: today, meal_type: customForm.meal, entry_type: 'custom', recipe_name: item.name.trim(), calories: calculated.calories, protein_g: calculated.protein, carbs_g: calculated.carbs, fat_g: calculated.fat, serving_g: Number(item.grams), portion_multiplier: 1, notes: mealTitle }
    })
    setLogBusy(true)
    try {
      const existingIds = new Set(editingCustomGroup?.logs.map((log) => log.id) || [])
      const retainedIds = new Set(draft.map((item) => item.id).filter((id) => !id.startsWith('draft-')))
      await Promise.all([...existingIds].filter((id) => !retainedIds.has(id)).map((id) => deleteMealLog({ userId, id })))
      const saved = await Promise.all(draft.map((item) => saveMealLog({ id: item.id.startsWith('draft-') ? undefined : item.id, userId, mealDate: today, mealType: item.meal_type, entryType: 'custom', recipeName: item.recipe_name, calories: item.calories, protein: item.protein_g, carbs: item.carbs_g, fat: item.fat_g, servingG: item.serving_g, notes: mealTitle })))
      setLoggedMeals((current) => [...current.filter((row) => !existingIds.has(row.id)), ...saved])
      setCustomForm({ meal: 'SNACK', title: '', items: [blankCustomItem()] })
      setCustomOpen(false)
      setEditingCustomGroup(null)
    } finally { setLogBusy(false) }
  }
  function editCustomGroup(group) {
    setEditingCustomGroup(group)
    setCustomForm({ meal: group.meal, title: group.title, items: group.logs.map((log) => {
      const grams = Number(log.serving_g) || 100
      const multiplier = 100 / grams
      return { sourceLogId: log.id, name: log.recipe_name || '', grams, caloriesPer100: Math.round((Number(log.calories) || 0) * multiplier), proteinPer100: Math.round((Number(log.protein_g) || 0) * multiplier), carbsPer100: Math.round((Number(log.carbs_g) || 0) * multiplier), fatPer100: Math.round((Number(log.fat_g) || 0) * multiplier) }
    }) })
    setCustomOpen(true)
  }
  function addFoodToMeal(meal) {
    setDiaryMeal(meal)
    setNutritionView('diary')
    window.setTimeout(() => document.getElementById('steel-food-search')?.focus(), 0)
  }
  async function addFoundFood({ food, grams, servingLabel, mealType }) {
    setLogBusy(true)
    try { await saveNutritionFoodEntry({ mealDate: today, mealType, food, grams, servingLabel }); await refreshLoggedMeals(); setFinderOpen(false) } finally { setLogBusy(false) }
  }
  const dietary = preferences.dietaryPreference || 'No preference'
  const allergyWords = (preferences.allergies || '').toLowerCase().split(/[,;]+/).map((word) => word.trim()).filter(Boolean)
  const assignedRecipes = recipes.filter((recipe) => {
    const text = `${recipe.name} ${recipe.detail} ${(recipe.ingredients || []).map(ingredientLabel).join(' ')}`.toLowerCase()
    return !allergyWords.some((word) => word.length > 2 && text.includes(word))
  })
  const loggedCalories = loggedMeals.reduce((total, row) => total + Number(row.calories || 0), 0)
  const loggedProtein = loggedMeals.reduce((total, row) => total + Number(row.protein_g || 0), 0)
  const loggedCarbs = loggedMeals.reduce((total, row) => total + Number(row.carbs_g || 0), 0)
  const loggedFat = loggedMeals.reduce((total, row) => total + Number(row.fat_g || 0), 0)
  const macroTargets = { protein: target.protein_g || 170, fat: Math.round((target.calories * .25) / 9), carbs: Math.max(0, Math.round((target.calories - (target.protein_g || 170) * 4 - Math.round((target.calories * .25) / 9) * 9) / 4)) }
  const mealOrder = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].filter((meal) => assignedRecipes.some((recipe) => recipe.meal === meal)).slice(0, Math.max(3, Number(preferences.mealsPerDay) || 3))
  const plannedLogs = loggedMeals.filter((row) => row.entry_type !== 'custom')
  const customLogs = loggedMeals.filter((row) => row.entry_type === 'custom')
  const customGroups = Object.values(customLogs.reduce((groups, log) => {
    const key = `${log.meal_type}-${log.notes || log.recipe_name}`
    if (!groups[key]) groups[key] = { key, meal: log.meal_type, title: log.notes || 'Custom meal', logs: [] }
    groups[key].logs.push(log)
    return groups
  }, {}))
  return <div className={`page-stack nutrition-page nutrition-page-${nutritionView}`}>
    <section className="page-intro"><span className="eyebrow">FUEL YOUR GOAL</span><h2>{nutritionView === 'diary' ? 'Food diary' : nutritionView === 'plan' ? 'Your meal plan' : 'Recipe library'}</h2><p>{nutritionView === 'diary' ? 'Track the food you actually ate, then let Steel keep the useful numbers clear.' : nutritionView === 'plan' ? 'Choose one balanced option per meal, adjust the portion and log what you actually eat.' : `Browse the recipes assigned around your ${dietary === 'No preference' ? 'training plan' : dietary.toLowerCase()} preferences.`}</p><div className="nutrition-view-switcher" role="tablist" aria-label="Nutrition views"><button type="button" className={nutritionView === 'diary' ? 'active' : ''} onClick={() => setNutritionView('diary')}>Food diary</button><button type="button" className={nutritionView === 'plan' ? 'active' : ''} onClick={() => setNutritionView('plan')}>Your meal plan</button><button type="button" className={nutritionView === 'library' ? 'active' : ''} onClick={() => setNutritionView('library')}>Recipe library</button></div></section>
    {planError && <div className="nutrition-plan-alert"><span>Showing your starter meals while your assigned plan reconnects.</span><button type="button" onClick={loadPlan}>Try again</button></div>}
    {nutritionView === 'plan' && <TodayMealPlan mealOrder={mealOrder} recipes={assignedRecipes} selectedChoices={selectedChoices} setSelectedChoices={setSelectedChoices} portions={portions} setPortions={setPortions} plannedLogs={plannedLogs} logBusy={logBusy} onEdit={openRecipeEditor} onLog={logMeal} onUnlog={removeMeal} onFindFood={(meal) => { setFinderMeal(meal); setFinderOpen(true) }}/>}
    {nutritionView === 'plan' && finderOpen && <section className="inline-food-finder steel-card"><div><span className="eyebrow">ADD TO {finderMeal}</span><h3>Find a food</h3><p>Search the catalogue or scan a barcode. Nothing is shown until you ask for it.</p></div><FoodDiary userId={userId} mealLogs={[]} initialMeal={finderMeal} onFoodPicked={addFoundFood}/><button type="button" className="text-link" onClick={() => setFinderOpen(false)}>Close food finder</button></section>}
    {nutritionView === 'plan' && !editingRecipe && <section className="meal-plan-edit-strip"><span>Make any meal your own</span>{mealOrder.map((meal) => { const options = assignedRecipes.filter((recipe) => recipe.meal === meal); const selected = options.find((recipe) => recipe.optionKey === selectedChoices[meal]) || options[0]; return <button type="button" key={meal} onClick={() => openRecipeEditor(selected)}>Edit {meal.toLowerCase()}</button> })}</section>}
    <article className="nutrition-hero"><div className="macro-orb"><span>{loggedCalories.toLocaleString('en-GB')}</span><small>kcal logged</small></div><div><span className="eyebrow">TODAY’S TARGET</span><h3>{target.calories.toLocaleString('en-GB')} kcal · {target.protein_g}g protein</h3><p>{dietary} · {preferences.mealsPerDay} meals per day</p></div></article>
    <section className="nutrition-macro-board"><div className="nutrition-board-heading"><div><span className="eyebrow">TODAY’S INTAKE</span><strong>{loggedCalories.toLocaleString('en-GB')} <small>/ {target.calories.toLocaleString('en-GB')} kcal</small></strong></div><span>{Math.max(0, target.calories - loggedCalories).toLocaleString('en-GB')} kcal remaining</span></div><div className="nutrition-macro-grid">{[['Protein', loggedProtein, macroTargets.protein, 'protein'], ['Carbs', loggedCarbs, macroTargets.carbs, 'carbs'], ['Fat', loggedFat, macroTargets.fat, 'fat']].map(([label, value, goal, key]) => <div key={key}><span>{label}</span><strong>{Math.round(value)}g <small>/ {goal}g</small></strong><i><b style={{ width: `${Math.min(100, Math.round((value / Math.max(1, goal)) * 100))}%` }}/></i></div>)}</div></section>
    {nutritionView === 'diary' && <FoodDiary userId={userId} mealLogs={loggedMeals} initialMeal={diaryMeal} onChanged={refreshLoggedMeals} />}
    {nutritionView === 'plan' && <section className="nutrition-plan-summary"><div><span className="eyebrow">TODAY’S PLAN</span><strong>{plannedLogs.length} of {mealOrder.length} planned meals logged</strong></div><span className="nutrition-plan-summary-actions"><button type="button" className="text-link" onClick={() => addFoodToMeal(mealOrder[0] || 'BREAKFAST')}>Search / scan food <ChevronRight size={14}/></button><button type="button" className="text-link" onClick={() => { setEditingCustomGroup(null); setCustomOpen((open) => !open) }}>{customOpen ? 'Close quick add' : 'Add custom meal'} <ChevronRight size={14}/></button></span></section>}
    {editingRecipe && <section className="steel-card meal-component-editor"><div className="meal-component-editor-heading"><div><span className="eyebrow">EDIT {editingRecipe.meal}</span><h3>{editingRecipe.name}</h3><p>Make the recipe match what you actually eat. Catalogue-linked foods carry their own verified serving and macro data.</p></div><button type="button" className="text-link" onClick={() => setEditingRecipe(null)}>Close</button></div><div className="meal-component-list">{editingComponents.map((component, index) => { const totals = componentTotals([component]); return <article key={component.key || index} className={component.foodId ? 'meal-component is-linked' : 'meal-component'}><div><strong>{component.name || 'Unnamed ingredient'}</strong><small>{component.foodId ? `${Math.round(totals.calories)} kcal · ${Math.round(totals.protein)}g protein` : 'Recipe blueprint — match it to a catalogue food to calculate exact macros.'}</small></div><label><span>Amount (g)</span><input type="number" min="1" inputMode="decimal" value={component.grams || ''} onChange={(event) => updateEditingComponent(index, { grams: event.target.value, servingLabel: `${event.target.value}g` })}/></label><button type="button" onClick={() => setMatchingComponentIndex(index)}>{component.foodId ? 'Change food' : 'Match food'}</button><button type="button" aria-label={`Remove ${component.name || 'ingredient'}`} onClick={() => setEditingComponents((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15}/></button></article> })}</div><div className="meal-component-actions"><button type="button" className="text-link" onClick={() => setMatchingComponentIndex(-1)}><Search size={15}/> Add another food</button><button type="button" className="gold-button" disabled={savingRecipe} onClick={saveEditedRecipe}>{savingRecipe ? 'Saving…' : 'Save meal changes'}</button></div>{matchingComponentIndex !== null && <div className="meal-component-picker"><div><span className="eyebrow">{editingComponents[matchingComponentIndex]?.name ? `MATCH ${editingComponents[matchingComponentIndex].name.toUpperCase()}` : 'ADD TO THIS MEAL'}</span><p>Search the catalogue or scan a barcode. The chosen food replaces this ingredient, or is added to the recipe.</p></div><FoodDiary userId={userId} mealLogs={[]} initialMeal={editingRecipe.meal} onFoodPicked={receiveCatalogueFood}/></div>}</section>}
    {customOpen && <form className="nutrition-custom-form steel-card" onSubmit={addCustomMeal}><div><span className="eyebrow">{editingCustomGroup ? 'EDIT CUSTOM MEAL' : 'CUSTOM MEAL'}</span><h3>{editingCustomGroup ? editingCustomGroup.title : 'Build what you actually ate'}</h3><p>Set each food’s nutrition per 100g, then change the serving weight. Steel calculates the real meal macros automatically.</p></div><div className="nutrition-custom-meta"><label><span>Meal</span><select value={customForm.meal} onChange={(event) => setCustomForm({ ...customForm, meal: event.target.value })}>{mealOrder.map((meal) => <option key={meal}>{meal}</option>)}</select></label><label><span>Meal name</span><input value={customForm.title} onChange={(event) => setCustomForm({ ...customForm, title: event.target.value })} placeholder="e.g. Burger night" /></label></div><div className="nutrition-custom-items">{customForm.items.map((item, index) => { const calculated = calculatedCustomItem(item); return <section className="nutrition-custom-item" key={index}><div className="nutrition-custom-item-heading"><strong>Item {index + 1}</strong>{customForm.items.length > 1 && <button type="button" onClick={() => removeCustomItem(index)}>Remove item</button>}</div><div className="nutrition-custom-grid nutrition-custom-grid-item"><label><span>Food</span><input required value={item.name} onChange={(event) => updateCustomItem(index, 'name', event.target.value)} placeholder="e.g. Milk chocolate" /></label><label><span>Amount (g)</span><input required inputMode="decimal" type="number" min="1" value={item.grams} onChange={(event) => updateCustomItem(index, 'grams', event.target.value)} /></label><label><span>kcal / 100g</span><input required inputMode="decimal" type="number" min="0" value={item.caloriesPer100} onChange={(event) => updateCustomItem(index, 'caloriesPer100', event.target.value)} /></label><label><span>Protein / 100g</span><input inputMode="decimal" type="number" min="0" value={item.proteinPer100} onChange={(event) => updateCustomItem(index, 'proteinPer100', event.target.value)} /></label><label><span>Carbs / 100g</span><input inputMode="decimal" type="number" min="0" value={item.carbsPer100} onChange={(event) => updateCustomItem(index, 'carbsPer100', event.target.value)} /></label><label><span>Fat / 100g</span><input inputMode="decimal" type="number" min="0" value={item.fatPer100} onChange={(event) => updateCustomItem(index, 'fatPer100', event.target.value)} /></label></div><div className="nutrition-item-calculated"><span>This serving</span><strong>{calculated.calories} kcal</strong><span>{calculated.protein}g protein · {calculated.carbs}g carbs · {calculated.fat}g fat</span></div></section> })}</div><button type="button" className="nutrition-add-item" onClick={addCustomItem}>+ Add another item</button><button className="gold-button" disabled={logBusy}><Save size={16}/> {editingCustomGroup ? 'Save meal changes' : 'Add meal to today'}</button></form>}
    {nutritionView !== 'diary' && <section className="nutrition-plan-list"><div className="section-heading"><div><span className="eyebrow">{nutritionView === 'plan' ? 'YOUR ASSIGNED MEALS' : 'RECIPE LIBRARY'}</span><h3>{nutritionView === 'plan' ? 'Today’s meals' : 'Browse recipes'}</h3></div><span className="nutrition-progress">3 choices each</span></div>{planBusy ? <div className="library-state">Loading your meal plan…</div> : mealOrder.length ? mealOrder.map((meal) => { const options = assignedRecipes.filter((recipe) => recipe.meal === meal); const selected = options.find((recipe) => recipe.optionKey === selectedChoices[meal]) || options[0]; const existing = plannedLogs.find((row) => row.meal_type === meal); const portion = Number(portions[meal] || 1); return <article className={`steel-card nutrition-meal-card ${existing ? 'is-logged' : ''} ${openMeal === meal ? 'is-expanded' : ''}`} key={meal}><div className="nutrition-meal-icon"><Salad size={19}/></div><div className="nutrition-recipe-copy"><span className="eyebrow">{meal}</span><h3>{selected.name}</h3><p>{selected.detail}</p><small>{Math.round(selected.servingG * portion)}g serving · {Math.round(selected.calories * portion)} kcal · {Math.round(selected.protein * portion)}g protein · {Math.round(selected.carbs * portion)}g carbs · {Math.round(selected.fat * portion)}g fat</small></div><div className="nutrition-meal-actions"><button type="button" className="nutrition-details-button" onClick={() => setOpenMeal(openMeal === meal ? null : meal)}>{openMeal === meal ? 'Hide' : 'Choose'}</button>{existing ? <button type="button" className="nutrition-unlog-button" disabled={logBusy} onClick={() => removeMeal(existing)}>Unlog</button> : <button type="button" className="nutrition-log-button" disabled={logBusy} onClick={() => logMeal(selected)}>Log meal</button>}</div>{openMeal === meal && <div className="nutrition-choice-panel"><div className="nutrition-choice-list">{options.map((option) => <button type="button" key={option.optionKey} className={selected.optionKey === option.optionKey ? 'active' : ''} onClick={() => setSelectedChoices({ ...selectedChoices, [meal]: option.optionKey })}><strong>{option.name}</strong><span>{option.servingG}g · {option.calories} kcal · {option.protein}g protein</span></button>)}</div><div className="nutrition-portion-row"><label><span>Portion</span><select value={portion} onChange={(event) => setPortions({ ...portions, [meal]: Number(event.target.value) })}>{[[.5,'Half'],[.75,'Three quarters'],[1,'Full serving'],[1.25,'One and a quarter'],[1.5,'One and a half']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="recipe-detail"><strong>Serving breakdown</strong><span>{Math.round(selected.servingG * portion)}g · {Math.round(selected.calories * portion)} kcal · {Math.round(selected.protein * portion)}g protein · {Math.round(selected.carbs * portion)}g carbs · {Math.round(selected.fat * portion)}g fat</span><strong>Ingredients</strong><span>{selected.ingredients.join(' · ')}</span><strong>How to make it</strong><span>{selected.instructions}</span></div></div></div>}</article> }) : <div className="library-state"><strong>No assigned meals yet.</strong><span>Complete your nutrition preferences in Settings so Steel can prepare your meal plan.</span><button type="button" className="library-retry" onClick={() => navigateToTab('Settings')}>Open Settings</button></div>}</section>}
    {customGroups.length > 0 && <section className="nutrition-custom-log-list"><div className="section-heading"><div><span className="eyebrow">ADDED TODAY</span><h3>Custom meals</h3></div></div>{customGroups.map((group) => <article className="steel-card nutrition-custom-log" key={group.key}><div><span className="eyebrow">{group.meal}</span><strong>{group.title}</strong><small>{group.logs.map((log) => `${log.recipe_name} (${log.serving_g || 0}g)`).join(' · ')}</small><em>{group.logs.reduce((total, log) => total + Number(log.calories || 0), 0)} kcal · {group.logs.reduce((total, log) => total + Number(log.protein_g || 0), 0)}g protein · {group.logs.reduce((total, log) => total + Number(log.carbs_g || 0), 0)}g carbs · {group.logs.reduce((total, log) => total + Number(log.fat_g || 0), 0)}g fat</em></div><span className="nutrition-custom-log-actions"><button type="button" disabled={logBusy} onClick={() => editCustomGroup(group)}>Edit</button><button type="button" disabled={logBusy} onClick={() => removeMealGroup(group.logs)}><Trash2 size={15}/> Unlog meal</button></span></article>)}</section>}
    <section className="nutrition-next-card"><div><span className="eyebrow">PLAN CONTROLS</span><h3>Keep it honest, not perfect.</h3><p>Choose the meal that suits today, set the portion you actually ate and add any unplanned food. Your daily totals update either way.</p></div><button type="button" className="text-link" onClick={() => navigateToTab('Settings')}>Edit preferences <ChevronRight size={14}/></button></section>
  </div>
}

function ExerciseDetailPanel({ exercise, onClose }) {
  if (!exercise) return null
  const secondary = exercise.secondary_muscle_groups ?? []
  return <div className="exercise-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="exercise-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title"><button type="button" className="more-sheet-close" aria-label="Close exercise details" onClick={onClose}>×</button><div className="exercise-detail-visual"><Dumbbell size={42}/><span>{exercise.primary_muscle_group}</span></div><span className="eyebrow">EXERCISE DETAIL</span><h2 id="exercise-detail-title">{exercise.name}</h2><div className="exercise-detail-tags"><span>{exercise.primary_muscle_group}</span>{secondary.slice(0, 3).map((group) => <span key={group}>{group}</span>)}<span>{exercise.difficulty}</span></div><p>{exercise.instructions || 'Use controlled reps, keep your form steady and stop if the movement causes pain.'}</p><div className="exercise-detail-facts"><div><span>Equipment</span><strong>{(exercise.equipment ?? []).join(' / ') || 'Gym'}</strong></div><div><span>Movement</span><strong>{exercise.movement_pattern || 'Strength'}</strong></div></div>{exercise.coaching_cues?.length ? <div className="exercise-detail-guidance"><strong>Coaching cues</strong><ul>{exercise.coaching_cues.slice(0, 3).map((cue) => <li key={cue}>{cue}</li>)}</ul></div> : null}{exercise.safety_notes ? <div className="exercise-detail-safety"><strong>Safety note</strong><span>{exercise.safety_notes}</span></div> : null}{exercise.video_url ? <a className="gold-button exercise-detail-video" href={exercise.video_url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Watch form video</a> : <p className="exercise-detail-muted">Form video coming soon for this movement.</p>}<button type="button" className="exercise-detail-back" onClick={onClose}>Back to library</button></section></div>
}

function ExerciseLibrary({ onSelectExercise }) {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('All muscle groups')
  const [equipment, setEquipment] = useState('All equipment')
  const [difficulty, setDifficulty] = useState('All levels')
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
  const difficultyOptions = [...new Set(rows.map((row) => row.difficulty).filter(Boolean))].sort()
  const visibleRows = rows.filter((row) => {
    const text = `${row.name} ${row.primary_muscle_group} ${(row.secondary_muscle_groups ?? []).join(' ')}`.toLowerCase()
    return (!query.trim() || text.includes(query.trim().toLowerCase())) && (muscleGroup === 'All muscle groups' || row.primary_muscle_group === muscleGroup) && (equipment === 'All equipment' || (row.equipment ?? []).includes(equipment)) && (difficulty === 'All levels' || row.difficulty === difficulty)
  })
  return <section className="exercise-library"><div className="library-toolbar"><label className="library-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" aria-label="Search exercises"/></label><div className="library-filters"><select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)} aria-label="Filter by muscle group"><option>All muscle groups</option>{muscles.map((muscle) => <option key={muscle}>{muscle}</option>)}</select><select value={equipment} onChange={(event) => setEquipment(event.target.value)} aria-label="Filter by equipment"><option>All equipment</option>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Filter by difficulty"><option>All levels</option>{difficultyOptions.map((level) => <option key={level}>{level}</option>)}</select></div></div>{busy ? <div className="library-state"><span>Loading the exercise library…</span></div> : error ? <div className="library-state library-error"><strong>We couldn’t load the library.</strong><span>Check your connection and try again.</span><button type="button" className="library-retry" onClick={refreshLibrary}>Try again</button></div> : <><div className="library-result-count">{visibleRows.length} exercise{visibleRows.length === 1 ? '' : 's'} available</div><div className="exercise-library-list">{visibleRows.map((row) => <article className="exercise-library-card" key={row.id}><div className="library-exercise-icon"><Dumbbell size={19}/></div><div className="library-exercise-copy"><strong>{row.name}</strong><span>{row.primary_muscle_group} · {(row.equipment ?? []).join(' / ') || 'Gym'}</span><small>{row.difficulty || 'All levels'} · {row.movement_pattern || 'Strength'}</small></div><div className="library-card-actions">{onSelectExercise && <button type="button" className="library-use-button" onClick={() => onSelectExercise(row)}>Use this exercise</button>}<button type="button" className="library-details-button" onClick={() => setSelectedExercise(row)}>Details</button>{row.video_url ? <a className="library-video-link" href={row.video_url} target="_blank" rel="noreferrer">Form <ExternalLink size={13}/></a> : null}</div></article>)}{!visibleRows.length && <div className="library-state"><strong>No exercises match those filters.</strong><span>Try a different muscle group, equipment type or difficulty.</span></div>}</div></>}{selectedExercise && <ExerciseDetailPanel exercise={selectedExercise} onClose={() => setSelectedExercise(null)}/>}</section>
}

function catalogueRowFromExercise(exercise) {
  return { id: exercise.id, programmeId: exercise.programmeId ?? null, name: exercise.name, primary_muscle_group: exercise.primary_muscle_group ?? exercise.muscleGroup ?? 'Full body', secondary_muscle_groups: exercise.secondary_muscle_groups ?? exercise.secondaryMuscleGroups ?? [], equipment: Array.isArray(exercise.equipment) ? exercise.equipment : exercise.equipment ? [exercise.equipment] : [], movement_pattern: exercise.movement_pattern ?? exercise.movementPattern ?? null, difficulty: exercise.difficulty ?? null, instructions: exercise.instructions ?? null, coaching_cues: exercise.coaching_cues ?? exercise.coachingCues ?? [], safety_notes: exercise.safety_notes ?? exercise.safetyNotes ?? null, video_url: exercise.video_url ?? exercise.youtubeUrl ?? null, sets: exercise.sets ?? 3, reps: exercise.reps ?? '8–12', startWeightKg: exercise.startWeightKg ?? 0 }
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

function SettingsPage({ user, userRole, onSignOut, closeSettings, accountName, avatarUrl, profileName, setProfileName, profileEmail, setProfileEmail, profilePhone, setProfilePhone, saveAccount, handleAvatar, avatarBusy, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, savePassword, saving, preferences, setPreferences, toggleEquipment, savePreferences, openSupportPanel, onResetOnboarding, notificationPreferences, onRemindersSaved }) {
  const [profileOpen, setProfileOpen] = useState(false)


  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const showAdminControls = userRole === 'admin'
  return <div className="page-stack settings-page-v5"><div className="settings-top-actions"><button className="settings-back-button" type="button" onClick={closeSettings}><ArrowLeft size={17}/> Back</button><button className="settings-signout-button" type="button" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div><section className="page-intro"><span className="eyebrow">PROFILE & SETTINGS</span><h2>Your Steel profile</h2><button className="settings-support-jump" type="button" onClick={() => document.getElementById('settings-support-v5')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span>Need help?</span><strong>Support &amp; feedback</strong><ChevronRight size={15}/></button></section><article className="settings-profile-card editable-profile"><div className="avatar-upload-wrap"><Avatar url={avatarUrl} size={72}/><label className="avatar-upload-button"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} disabled={avatarBusy}/></label></div><div><span className="eyebrow">DISPLAY PROFILE</span><h3>{accountName}</h3><p>{avatarBusy?'Uploading photo…':user.email}</p></div></article><SettingsDisclosure id="settings-profile-v5" eyebrow="PERSONAL PROFILE" title="Personal profile" icon={UserRound} open={profileOpen} onToggle={()=>setProfileOpen(open=>!open)}><form className="personal-profile-form" onSubmit={saveAccount}><div className="settings-subsection"><div className="settings-subsection-heading"><span className="eyebrow">CONTACT DETAILS</span><strong>Personal details</strong></div><div className="profile-form-grid"><label><span>Name</span><input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></label><label><span>Email</span><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required/></label><label><span>Phone number</span><input type="tel" autoComplete="tel" placeholder="Optional" value={profilePhone} onChange={e=>setProfilePhone(e.target.value)}/></label></div></div><div className="settings-subsection"><div className="settings-subsection-heading"><span className="eyebrow">ACCOUNT SECURITY</span><strong>Change password</strong></div><p className="settings-form-copy">Leave these blank if you only want to update your profile details.</p><label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} /></label><label><span>New password</span><input type="password" autoComplete="new-password" minLength="6" value={newPassword} onChange={e=>setNewPassword(e.target.value)} /></label><label><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength="6" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></label></div><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save profile'}</button></form></SettingsDisclosure><SettingsDisclosure id="settings-preferences-v5" eyebrow="TRAINING PREFERENCES" title="Shape your Steel plan" icon={Target} open={preferencesOpen} onToggle={()=>setPreferencesOpen(open=>!open)}><PreferencesForm preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} onSubmit={savePreferences} saving={saving}/></SettingsDisclosure><HealthIntegrations/><ReminderSettings userId={user.id} initialPreferences={notificationPreferences} onSaved={onRemindersSaved}/><section className="settings-support-card settings-support-footer" id="settings-support-v5"><div className="settings-footer-layout"><div className="section-heading"><div><span className="eyebrow">NEED A HAND?</span><h3>Support</h3></div></div><article className="settings-security-card"><span className="settings-security-icon"><ShieldCheck size={22}/></span><div><span className="eyebrow">YOUR DATA</span><h3>Private by default</h3><p>Workout, weight, profile and step records remain scoped to your authenticated account.</p></div></article></div><div className="settings-support-list"><button type="button" onClick={()=>openSupportPanel('help')}><span><strong>Help &amp; Support</strong><small>Get help using Steel</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('about')}><span><strong>About Steel</strong><small>Learn more about the app</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('feedback')}><span><strong>Send feedback</strong><small>Tell us how Steel can improve</small></span><ChevronRight size={17}/></button></div>{showAdminControls && <aside className="settings-admin-footer"><div><span className="eyebrow">BACKEND / ADMIN</span><strong>Testing controls</strong><small>Owner-only tools for verifying onboarding and account flows.</small></div><button type="button" className="settings-admin-button" onClick={onResetOnboarding} disabled={saving}>Reset onboarding</button></aside>}</section></div>
}

export default function AppV3({ user, onSignOut }) {
  const [tab, setTab] = useState(() => {
    const requested = window.location.hash.replace(/^#/, '')
    return [...tabs.map(({ id }) => id), 'Settings'].includes(requested) ? requested : 'Home'
  })
  const [settingsReturnTab, setSettingsReturnTab] = useState('Home')
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false)
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
  useSteelReminders(user.id, profile?.notification_preferences)
  const [userRole, setUserRole] = useState('user')
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
  const [preferences, setPreferences] = useState({ goal: 'Lose fat and gain muscle', experienceLevel: 'Intermediate', availableEquipment: ['Machines'], trainingDays: 3, checkinDay: 0, units: 'lb', limitations: '', dietaryPreference: 'No preference', allergies: '', mealsPerDay: 3, goalTimeframeWeeks: 12, sessionDurationMin: 45, trainingLocation: 'Gym', currentTrainingDays: '', dailyActivityLevel: '', sleepQuality: '', trainingStyles: [], exercisePreferences: '', exerciseAvoidances: '', cardioPreference: 'No preference', cardioExperience: 'Beginner', cardioSessions: 0, cookingTime: '', preferredFoods: '' })
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
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
    const [programme, dashboard, todaySteps, stepHistoryRows, history, recent, profileRow, intakeRow, latestCheckin, activitySummary, checkinHistory, role, activeGeneratedProgramme] = await Promise.all([
      loadWorkouts(user.id), getDashboardStats(user.id), getTodaySteps(user.id),
      getStepHistory(user.id, 30),
      getWeightHistory(user.id, 30), getRecentSessions(user.id, 8), getProfile(user.id), getProgrammeIntake(user.id), getLatestWeeklyCheckin(user.id), getWeeklyActivitySummary(user.id, start, end), getWeeklyCheckinHistory(user.id), loadUserRole(user.id).catch(() => 'user'), getActiveGeneratedProgramme(user.id),
    ])
    const resolvedPreferences = { goal: profileRow?.goal || 'Lose fat and gain muscle', experienceLevel: profileRow?.experience_level || 'Intermediate', availableEquipment: profileRow?.available_equipment?.length ? profileRow.available_equipment : ['Machines'], trainingDays: Number(profileRow?.training_days || 3), checkinDay: Number(profileRow?.checkin_day ?? 0), units: profileRow?.units || 'lb', limitations: profileRow?.limitations || '', dietaryPreference: profileRow?.dietary_preference || 'No preference', allergies: profileRow?.allergies || '', mealsPerDay: Number(profileRow?.meals_per_day || 3), goalTimeframeWeeks: Number(intakeRow?.goal_timeframe_weeks || 12), sessionDurationMin: Number(intakeRow?.session_duration_min || 45), trainingLocation: intakeRow?.training_location || 'Gym', currentTrainingDays: intakeRow?.current_training_days ?? '', dailyActivityLevel: intakeRow?.daily_activity_level || '', sleepQuality: intakeRow?.sleep_quality ?? '', trainingStyles: intakeRow?.training_styles || [], exercisePreferences: intakeRow?.exercise_preferences || '', exerciseAvoidances: intakeRow?.exercise_avoidances || '', cardioPreference: intakeRow?.cardio_preference || 'No preference', cardioExperience: intakeRow?.cardio_experience || 'Beginner', cardioSessions: Number(intakeRow?.cardio_sessions || 0), cookingTime: intakeRow?.cooking_time || '', preferredFoods: intakeRow?.preferred_foods || '' }
    let visibleProgramme = programme
    if (profileRow?.onboarding_completed && intakeRow && !activeGeneratedProgramme) {
      try {
        const catalogue = await loadExerciseCatalog()
        await replaceGeneratedProgramme(buildGeneratedProgramme({ catalogue, preferences: resolvedPreferences }))
        visibleProgramme = await loadWorkouts(user.id)
      } catch (error) {
        // Keep the safe starter content available if a personal plan cannot yet be generated.
        console.warn('Personalised programme was not generated', error)
      }
    }
    setWorkouts(visibleProgramme); setStats(dashboard); setSteps(todaySteps); setStepHistory(stepHistoryRows); setWeights(history); setSessions(recent); setWeeklyCheckin(latestCheckin); setWeeklyCheckinHistory(checkinHistory); setWeeklyActivity(activitySummary); setProfile(profileRow); setUserRole(role)
    setPreferences(resolvedPreferences)
    const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'
    setProfileName(profileRow?.display_name || fallbackName)
    setProfilePhone(profileRow?.phone || '')
    setProfileEmail(user.email || '')
    if (!selectedId && visibleProgramme[0]) setSelectedId(visibleProgramme[0].id)
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
  useEffect(() => {
    if (!atFinisher || !draft) return
    const panel = document.querySelector('.finisher-panel')
    if (!panel) return
    const title = panel.querySelector('h2')
    const detail = panel.querySelector('p')
    if (draft.cardio) {
      if (title) title.textContent = draft.cardio.activity
      if (detail) detail.textContent = `${draft.cardio.minutes} min · RPE ${draft.cardio.rpe}`
    } else {
      if (title) title.textContent = 'No cardio prescribed'
      if (detail) detail.textContent = 'Your personalised strength work is complete. Save the session when you are ready.'
    }
  }, [atFinisher, draft])
  const currentExerciseName = currentExercise?.name?.trim().toLowerCase()
  const firstName = (profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'there').split(' ')[0]
  const accountName = profile?.display_name || user.user_metadata?.full_name || firstName
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const latestWeight = stats.latestWeightLb ? Number(stats.latestWeightLb) : null
  const totalSteps = stepHistory.reduce((total, item) => total + Number(item.steps || 0), 0)
  const todaySteps = Number(steps.steps || 0)
  const previousWeight = weights.length > 1 ? Number(weights[weights.length - 2].weight_lb) : null
  const weightDelta = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null
  const nextCheckin = nextCheckinDate(preferences.checkinDay, weeklyCheckin?.submitted_at)
  const dailySummary = useMemo(() => buildDailySummary({ todaySteps, latestSessionDate: stats.latestSession?.session_date, hasWorkout: workouts.length > 0 }), [stats.latestSession?.session_date, todaySteps, workouts.length])
  const trainingRecommendation = useMemo(() => buildTrainingRecommendation({ checkin: weeklyCheckin, hasWorkout: workouts.length > 0 }), [weeklyCheckin, workouts.length])

  async function refreshSteps() {
    const [today, history] = await Promise.all([getTodaySteps(user.id), getStepHistory(user.id)])
    setSteps(today); setStepHistory(history)
  }

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
    const replacement = { id: row.id, source: 'catalog', programmeId: null, name: row.name, equipment: (row.equipment ?? []).join(' / ') || 'Gym', muscleGroup: row.primary_muscle_group ?? null, secondaryMuscleGroups: row.secondary_muscle_groups ?? [], movementPattern: row.movement_pattern ?? null, difficulty: row.difficulty ?? null, instructions: row.instructions ?? null, youtubeUrl: row.video_url ?? null, thumbnailUrl: row.thumbnail_url ?? null, sets: currentExercise?.sets ?? row.sets ?? 3, reps: currentExercise?.reps ?? row.reps ?? '8–12', rpe: currentExercise?.rpe ?? null, restSeconds: currentExercise?.restSeconds ?? null, loadGuidance: currentExercise?.loadGuidance ?? null }
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

  async function persistPreferences(nextPreferences = preferences, { generatePlan = false } = {}) {
    setSaving(true); setMessage('')
    try {
      const resolvedPreferences = { ...preferences, ...nextPreferences }
      const next = await saveProfile(user.id, { displayName: profileName.trim(), avatarUrl, ...resolvedPreferences, experienceLevel: resolvedPreferences.experienceLevel, availableEquipment: resolvedPreferences.availableEquipment, trainingDays: Number(resolvedPreferences.trainingDays), checkinDay: Number(resolvedPreferences.checkinDay), mealsPerDay: Number(resolvedPreferences.mealsPerDay), dietaryPreference: resolvedPreferences.dietaryPreference, allergies: resolvedPreferences.allergies, onboardingCompleted: true })
      await saveProgrammeIntake(user.id, resolvedPreferences)
      if (generatePlan) {
        const catalogue = await loadExerciseCatalog()
        await replaceGeneratedProgramme(buildGeneratedProgramme({ catalogue, preferences: resolvedPreferences }))
        const updatedWorkouts = await loadWorkouts(user.id)
        setWorkouts(updatedWorkouts)
        if (updatedWorkouts[0]) setSelectedId(updatedWorkouts[0].id)
      }
      setProfile(next); setMessage(generatePlan ? 'Your personalised training plan is ready.' : 'Training preferences saved. Your existing plan stays in place until a planned review.')
    } catch (e) { setMessage(e.message) } finally { setSaving(false) }
  }

  async function savePreferences(event) {
    event?.preventDefault?.()
    return persistPreferences(preferences)
  }

  function completeOnboarding(nextPreferences = preferences) {
    return persistPreferences(nextPreferences, { generatePlan: true })
  }

  async function handleResetOnboarding() {
    if (!window.confirm('Reset onboarding for this account so you can test it again?')) return
    setSaving(true); setMessage('')
    try {
      const next = await resetOnboarding(user.id)
      setProfile(next)
      setOnboardingDismissed(false)
      setMessage('Onboarding reset. You can complete the setup flow again.')
    } catch (e) { setMessage(e.message || 'Onboarding could not be reset.') } finally { setSaving(false) }
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
  if (!profile?.onboarding_completed && !onboardingDismissed) return <OnboardingFlow preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} onComplete={completeOnboarding} saving={saving} onSignOut={onSignOut} />

  return <div className={`steel-app ${desktopNavCollapsed ? 'desktop-nav-collapsed' : ''}`}>
    <main className="steel-screen">
      <header className="v2-topbar">
        <div className="brand-lockup"><div className="brand-emblem"><SteelMark /></div><div><div className="eyebrow">SPARTAN STRENGTH, EVERY DAY</div><h1>PROJECT <span>STEEL</span></h1></div></div>
        <button className={`account-button ${tab === 'Settings' ? 'active' : ''}`} onClick={openSettings}><Avatar url={avatarUrl} size={32} /><span className="account-copy"><strong>{accountName}</strong><small>Profile</small></span><ChevronRight size={15} /></button>
      </header>
      {message && <div className="toast-note">{message}</div>}

      {tab === 'Train' && (!selectedWorkout || !draft) && <StartWorkoutChooser workouts={workouts} openWorkout={openWorkout} onBrowse={() => navigateToTab('Plan')} onCreateCustom={() => { setEditingWorkout(null); setCustomLogOpen(true); navigateToTab('Plan') }} />}

      {tab === 'Home' && <div className="page-stack home-page-stack">
        <section className="v4-welcome-card"><div className="v4-hero-art"><div className="v4-hero-figure" aria-hidden="true" /></div><div className="v4-hero-copy"><span className="eyebrow">{dailySummary.eyebrow}</span><h2>{firstName}</h2><p>{dailySummary.detail}</p><button type="button" className="hero-checkin-reminder" onClick={() => navigateToTab('Checkin')}><ClipboardCheck size={14}/> Your next check-in is {formatDate(localDateKey(nextCheckin))}</button></div><div className="v4-metric-grid"><article><Dumbbell size={17}/><span>WORKOUTS</span><strong>{stats.sessionCount}</strong><small>Logged</small></article><article><Flame size={17}/><span>STREAK</span><strong>{stats.streakDays || 0}</strong><small>Days</small></article><article><Footprints size={17}/><span>STEPS</span><strong>{todaySteps.toLocaleString('en-GB')}</strong><small>Today</small></article><button type="button" className="v4-metric-link" onClick={() => navigateToTab('Weight')}><Scale size={17}/><span>WEIGHT</span><strong>{latestWeight ? latestWeight.toFixed(1) : '—'}</strong><small>lb</small></button></div></section>
        <HomeDirectionCard summary={dailySummary} recommendation={trainingRecommendation} hasWorkout={workouts.length > 0} onStartWorkout={() => openWorkout(workouts[0])} onCheckin={() => navigateToTab('Checkin')} />
        <section className="v4-quick-actions"><div className="section-heading"><div><span className="eyebrow">MAKE IT EASY</span><h3>Quick actions</h3></div></div><div className="v4-action-grid">{workouts[0]&&<button onClick={()=>openWorkout(workouts[0])}><Play/><span>Start workout</span></button>}<button onClick={()=>navigateToTab('MealPlan')}><Salad/><span>Meal plan</span></button><button onClick={()=>navigateToTab('Weight')}><Scale/><span>Log weight</span></button><button onClick={()=>navigateToTab('Progress')}><ListChecks/><span>View progress</span></button></div></section>
        <PersonalisedJourneyCard workouts={workouts} preferences={preferences} navigateToTab={navigateToTab} onStartWorkout={openWorkout}/>
        <section className={`steel-card movement-card ${stepHistory.length ? '' : 'is-empty'}`}><div className="movement-card-heading"><div><span className="eyebrow">MOVEMENT HISTORY</span><h3>Steps total</h3><span className="metric-label">Last 30 days</span></div><div className="step-total"><strong>{totalSteps.toLocaleString('en-GB')}</strong><small>steps logged</small></div></div><div className="movement-card-meta"><span>Today <strong>{Number(steps.steps || 0).toLocaleString('en-GB')}</strong>{steps.source === 'manual' ? ' · entered manually' : steps.source ? ` · synced from ${steps.source}` : ''}</span><button className="text-link" onClick={() => navigateToTab('Progress')}>View progress <ChevronRight size={14}/></button></div><StepsChart data={stepHistory}/><ManualSteps userId={user.id} steps={steps} onSaved={refreshSteps}/>{!stepHistory.length&&<button className="movement-empty-link" onClick={openSettings}><Settings size={14}/> Explore planned health integrations</button>}</section>
        <section className="home-workout-section"><div className="section-heading"><div><span className="eyebrow">YOUR PROGRAMME</span><h3>Choose a workout</h3></div><button className="text-link" onClick={() => navigateToTab('Plan')}>View all</button></div><div className="workout-tile-stack">{workouts.map((w, i) => <button className="workout-tile" key={w.id} onClick={() => openWorkout(w)}><div className={`tile-art tile-art-${i+1}`}><Dumbbell size={30}/></div><div className="tile-copy"><span className="eyebrow">WORKOUT {i+1}</span><strong>{w.name}</strong><small>{w.exercises.length} exercises · {w.duration}</small></div><span className="tile-arrow"><ChevronRight size={19}/></span></button>)}</div></section>
      </div>}

      {tab === 'Plan' && (customLogOpen ? <LogWorkoutPage initialWorkout={editingWorkout} saving={saving} onCancel={() => { setEditingWorkout(null); setCustomLogOpen(false) }} onSave={editingWorkout ? saveEditedWorkout : null} onStart={saveAndStartCustomWorkout}/> : <PlanPage workouts={workouts} openWorkout={openWorkout} onLogWorkout={() => { setEditingWorkout(null); setCustomLogOpen(true) }} onEditWorkout={editWorkout} onDuplicateWorkout={duplicateWorkout} libraryMode={exerciseSwapMode} onSelectExercise={exerciseSwapMode ? addExerciseToSession : undefined} onCancelLibrary={closeExerciseLibrary}/>)}

{tab === 'Train' && <div className="page-stack training-page">{!selectedWorkout || !draft ? <section className="empty-state"><Dumbbell size={34}/><h2>Choose a workout</h2><p>Start from Home or Workouts.</p>{workouts[0]&&<button className="gold-button" onClick={()=>openWorkout(workouts[0])}>Start workout</button>}</section> : <><section className="train-top"><div><span className="eyebrow">ACTIVE WORKOUT</span><h2>{selectedWorkout.name}</h2></div><select value={selectedWorkout.id} onChange={(e)=>changeWorkout(e.target.value)}>{workouts.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></section><div className="train-progress-copy"><span>{atFinisher?'Final step':`Exercise ${draft.step+1} of ${activeExercises.length}`}</span><span>{Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%</span></div><div className="train-progress"><span style={{width:`${Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%`}}/></div>{!atFinisher&&currentExercise&&<><article className="exercise-focus-card"><div className="exercise-visual"><Dumbbell size={48}/><span>NOW</span></div><div className="exercise-focus-copy"><div className="exercise-focus-heading"><div><span className="eyebrow">CURRENT EXERCISE</span><h2>{currentExercise.name}</h2></div><span className="exercise-step-count">{draft.sets[currentExercise.id]?.filter((set) => set.complete && !set.removed).length || 0} / {currentExercise.sets}</span></div><p>{currentExercise.equipment} · {currentExercise.sets} sets × {currentExercise.reps}</p>{(currentExercise.muscleGroup||currentExercise.difficulty)&&<div className="exercise-metadata">{currentExercise.muscleGroup&&<span>{currentExercise.muscleGroup}</span>}{currentExercise.secondaryMuscleGroups?.slice(0,2).map(group=><span key={group}>{group}</span>)}{currentExercise.difficulty&&<span>{currentExercise.difficulty}</span>}</div>}{currentExercise.instructions&&<p className="exercise-instructions">{currentExercise.instructions}</p>}<div className="exercise-actions"><button type="button" className="exercise-action-button" onClick={openExercisePicker}><RotateCcw size={15}/> Change exercise</button>{currentExercise.youtubeUrl&&<a className="exercise-action-button exercise-video-link" href={currentExercise.youtubeUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Form video</a>}<button type="button" className="exercise-action-button exercise-remove-button" onClick={()=>setRemoveConfirmId(currentExercise.id)}><Trash2 size={15}/> Remove</button></div>{removeConfirmId===currentExercise.id&&<div className="exercise-remove-confirm"><span>Remove this exercise from today’s session?</span><div><button type="button" onClick={()=>setRemoveConfirmId(null)}>Keep it</button><button type="button" className="confirm-remove-button" onClick={confirmRemoveExercise}>Remove exercise</button></div></div>}</div></article><div className="set-list-v2">{(draft.sets[currentExercise.id]||[]).map(set=><article className={`set-row-v2 ${set.complete?'complete':''} ${set.removed?'removed':''}`} key={set.setNo}><div className="set-number">{set.setNo}</div>{!set.removed?<><label><span>KG</span><input type="number" min="0" step="2.5" value={set.weight} onChange={e=>updateSet(currentExercise.id,set.setNo,{weight:Number(e.target.value)||0})}/></label><label><span>REPS</span><input type="number" min="1" value={set.reps} onChange={e=>updateSet(currentExercise.id,set.setNo,{reps:Number(e.target.value)||1})}/></label><div className="set-actions-v2"><button className={set.complete?'done-button done':'done-button'} onClick={()=>updateSet(currentExercise.id,set.setNo,{complete:!set.complete})}><Check size={16}/> {set.complete?'Done':'Complete'}</button><button className="remove-button" onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:true,complete:false})}><Trash2 size={15}/> Remove</button></div></>:<div className="removed-copy"><span>Removed</span><button onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:false})}><RotateCcw size={15}/> Restore</button></div>}</article>)}</div><div className="train-nav-row"><button disabled={draft.step===0} onClick={()=>moveStep(draft.step-1)}><ArrowLeft size={17}/> Previous</button><button className="gold-button" onClick={()=>moveStep(draft.step+1)}>{draft.step===activeExercises.length-1?'Finisher':'Next'} <ArrowRight size={17}/></button></div></>}{atFinisher&&<><article className="finisher-panel"><div className="finisher-symbol"><Flame size={24}/></div><div><span className="eyebrow">FINISH STRONG</span><h2>Incline cardio</h2><p>7 min · 6% incline · RPE 6</p></div></article><article className="session-summary-v2"><div className="summary-hero"><Check size={20}/><div><span className="eyebrow">SESSION SUMMARY</span><strong>{completedSets} working sets</strong></div></div></article>{draft.removedExercises.length>0&&<details className="options-panel"><summary>Restore removed exercises</summary>{draft.removedExercises.map(id=>{const e=selectedWorkout.exercises.find(x=>x.id===id);return e?<button className="restore-exercise" key={id} onClick={()=>restoreExercise(id)}><RotateCcw size={14}/> {e.name}</button>:null})}</details>}<button type="button" className="gold-button add-exercise-from-session" onClick={openExercisePicker}><Dumbbell size={17}/> Add or change exercise</button><div className="train-nav-row"><button onClick={()=>moveStep(Math.max(activeExercises.length-1,0))}><ArrowLeft size={17}/> Back</button><button className="gold-button" disabled={!completedSets||saving} onClick={saveSession}><Save size={17}/> {saving?'Saving…':'Save session'}</button></div></>}</>}</div>}

      {tab === 'Train' && draft && atFinisher && <SessionNotesField value={sessionNotes} onChange={setSessionNotes} completedSets={completedSets}/>}
      {tab === 'Progress' && <ProgressPage stats={stats} sessions={sessions} weights={weights} stepHistory={stepHistory} totalSteps={totalSteps}/>}

      {tab === 'Checkin' && <WeeklyCheckinPage checkin={weeklyCheckin} checkinDay={preferences.checkinDay} activitySummary={weeklyActivity} mediaItems={checkinMedia} historyItems={weeklyCheckinHistory} onSave={submitWeeklyCheckin} onUploadMedia={submitCheckinMedia} saving={saving} mediaBusy={mediaBusy} />}

      {tab === 'Weight' && <WeightPage latestWeight={latestWeight} weightDelta={weightDelta} weights={weights} weightInput={weightInput} setWeightInput={setWeightInput} submitWeight={submitWeight} saving={saving}/>}

      {tab === 'MealPlan' && <NutritionPage userId={user.id} preferences={preferences} navigateToTab={navigateToTab}/>}
      {tab === 'Library' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">YOUR TRAINING</span><h2>Exercise library</h2><p>Browse every movement and open the form guidance before you train.</p></section><ExerciseLibrary/></div>}
      {tab === 'Settings' && <SettingsPage user={user} userRole={userRole} onSignOut={onSignOut} closeSettings={closeSettings} accountName={accountName} avatarUrl={avatarUrl} profileName={profileName} setProfileName={setProfileName} profileEmail={profileEmail} setProfileEmail={setProfileEmail} profilePhone={profilePhone} setProfilePhone={setProfilePhone} saveAccount={savePersonalProfile} handleAvatar={handleAvatar} avatarBusy={avatarBusy} currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} savePassword={savePassword} saving={saving} preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} savePreferences={savePreferences} openSupportPanel={openSupportPanel} onResetOnboarding={handleResetOnboarding} notificationPreferences={profile?.notification_preferences} onRemindersSaved={setProfile}/>}
      {supportPanel && <div className="support-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSupportPanel() }}><section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-dialog-title"><button className="support-dialog-close" type="button" aria-label="Close support panel" onClick={closeSupportPanel}>×</button>{supportPanel === 'help' && <><div className="support-dialog-icon"><HelpCircle size={22}/></div><span className="eyebrow">STEEL HELP</span><h2 id="support-dialog-title">Train with confidence</h2><p>Choose a workout from Home or Workouts, complete each set, then save the session at the end. Your logged sessions, weight and steps feed the Progress view.</p><div className="support-help-list"><div><strong>Can’t see your steps?</strong><span>Open Settings and connect a supported health provider when integrations are enabled.</span></div><div><strong>Need to change your plan?</strong><span>Start with your goal and equipment preferences; personalised journeys are coming next.</span></div><div><strong>Something went wrong?</strong><span>Refresh once, then check that you are signed in to the correct Steel account.</span></div></div></>}{supportPanel === 'about' && <><div className="support-dialog-icon"><Info size={22}/></div><span className="eyebrow">ABOUT PROJECT STEEL</span><h2 id="support-dialog-title">Your training homebase</h2><p>Project Steel is a private, mobile-first training space for workouts, progress, body-weight check-ins and daily movement.</p><div className="support-about-points"><span>Private account data protected by Supabase authentication and row-level security.</span><span>Spartan-inspired guidance designed to make consistent training feel clear and achievable.</span><span>AI trainer, meal planning and connected fitness journeys are part of the wider roadmap.</span></div></>}{supportPanel === 'feedback' && <><div className="support-dialog-icon"><MessageSquare size={22}/></div><span className="eyebrow">SHAPE THE NEXT RELEASE</span><h2 id="support-dialog-title">Send feedback</h2>{feedbackSaved ? <div className="support-feedback-success"><strong>Thanks — your feedback is captured for this session.</strong><button className="gold-button" type="button" onClick={() => setFeedbackSaved(false)}>Add more feedback</button></div> : <form className="support-feedback-form" onSubmit={saveFeedback}><label htmlFor="steel-feedback">What should Steel improve next?</label><textarea id="steel-feedback" value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} placeholder="Tell us what would make your next session easier…" rows="5" required/><button className="gold-button" type="submit" disabled={!feedbackText.trim()}>Save feedback</button></form>}</>}{supportPanel !== 'feedback' && <button className="gold-button support-dialog-action" type="button" onClick={closeSupportPanel}>Back to Settings</button>}</section></div>}
      <small className="steel-build">Steel · Build {import.meta.env.VITE_BUILD_SHA || "development"}</small>
    </main>
    {moreOpen && <div className="more-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoreOpen(false) }}><section className="more-sheet" role="dialog" aria-modal="true" aria-labelledby="more-sheet-title"><div className="more-sheet-handle"/><div className="more-sheet-heading"><div><span className="eyebrow">PROJECT STEEL</span><h2 id="more-sheet-title">More</h2></div><button type="button" className="more-sheet-close" aria-label="Close more menu" onClick={() => setMoreOpen(false)}>×</button></div><div className="more-sheet-grid"><button onClick={() => navigateToTab('Plan')}><Dumbbell/><span>Workouts</span></button><button onClick={() => navigateToTab('Library')}><ListChecks/><span>Exercise library</span></button><button onClick={() => navigateToTab('Checkin')}><ClipboardCheck/><span>Weekly check-in</span></button><button onClick={() => navigateToTab('Recipes')}><Salad/><span>Recipes</span></button><button onClick={() => navigateToTab('Weight')}><Scale/><span>Weight</span></button><button onClick={openSettings}><Settings/><span>Settings</span></button></div></section></div>}
    <nav className="v2-bottom-nav" aria-label="Project Steel navigation">{mobileTabs.map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>navigateToTab(id)}><Icon size={20}/><span>{label}</span></button>)}<button className={moreOpen || !mobileTabs.some(({id})=>id===tab) ? 'active' : ''} aria-expanded={moreOpen} onClick={()=>setMoreOpen((open)=>!open)}><MoreHorizontal size={20}/><span>More</span></button></nav>
    <nav className={`v4-desktop-nav ${desktopNavCollapsed ? 'is-collapsed' : ''}`} aria-label="Project Steel desktop navigation"><div className="v4-desktop-brand"><div className="brand-emblem"><SteelMark size={22}/></div><strong>PROJECT STEEL</strong></div><button type="button" className="desktop-nav-toggle" onClick={() => setDesktopNavCollapsed((collapsed) => !collapsed)} aria-label={desktopNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={desktopNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!desktopNavCollapsed}><ChevronRight size={20}/><span>{desktopNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span></button>{tabs.filter(({id})=>id!=='Train').map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>navigateToTab(id)} aria-label={label} title={desktopNavCollapsed ? undefined : label}><Icon size={20}/><span>{label}</span></button>)}<button className={tab==='Settings'?'active':''} onClick={openSettings} aria-label="Settings" title={desktopNavCollapsed ? undefined : "Settings"}><Settings size={20}/><span>Settings</span></button><div className="v4-desktop-support"><span className="eyebrow">SUPPORT</span><button onClick={openSettings}>Help &amp; Support <ChevronRight size={15}/></button><button onClick={openSettings}>About Steel <ChevronRight size={15}/></button></div></nav>
  </div>
}
