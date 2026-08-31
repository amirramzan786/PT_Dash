import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, Camera, Check, ChevronDown, ChevronRight, Dumbbell, Flame,
  Footprints, HelpCircle, Home, Info, LineChart, LogOut, MessageSquare, Play, RotateCcw, Save, Scale, Settings,
  ShieldCheck, Target, Trash2, UserRound, Watch, ListChecks,
} from 'lucide-react'
import {
  changePassword, getDashboardStats, getProfile, getRecentSessions, getTodaySteps, getStepHistory, getWeightHistory,
  loadWorkouts, saveProfile, saveWeight, saveWorkoutSession, updateAccount, uploadAvatar,
} from './lib/steelApi'
import './app-v2.css'
import './settings.css'
import './v3.css'
import SteelMark from './components/SteelMark'

const tabs = [
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'Plan', label: 'Workouts', icon: Dumbbell },
  { id: 'Train', label: 'Start', icon: Activity },
  { id: 'Progress', label: 'Progress', icon: LineChart },
  { id: 'Weight', label: 'Weight', icon: Scale },
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

function SettingsPage({ user, onSignOut, closeSettings, accountName, avatarUrl, profileName, setProfileName, profileEmail, setProfileEmail, saveAccount, handleAvatar, avatarBusy, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, savePassword, saving, preferences, setPreferences, toggleEquipment, savePreferences, openSupportPanel }) {
  return <div className="page-stack settings-page-v5"><div className="settings-top-actions"><button className="settings-back-button" type="button" onClick={closeSettings}><ArrowLeft size={17}/> Back</button><button className="settings-signout-button" type="button" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div><section className="page-intro"><span className="eyebrow">PROFILE & SETTINGS</span><h2>Your Steel profile</h2><p>Personalise your account and prepare health syncing.</p><button className="settings-support-jump" type="button" onClick={() => document.getElementById('settings-support-v5')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span>Need help?</span><strong>Support &amp; feedback</strong><ChevronRight size={15}/></button></section><article className="settings-profile-card editable-profile"><div className="avatar-upload-wrap"><Avatar url={avatarUrl} size={72}/><label className="avatar-upload-button"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} disabled={avatarBusy}/></label></div><div><span className="eyebrow">DISPLAY PROFILE</span><h3>{accountName}</h3><p>{avatarBusy?'Uploading photo…':user.email}</p></div></article><form className="steel-card profile-form" onSubmit={saveAccount}><label><span>Name</span><input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></label><label><span>Email</span><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required/></label><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save profile'}</button></form><SettingsDisclosure id="settings-preferences-v5" eyebrow="TRAINING PREFERENCES" title="Shape your Steel plan" icon={Target} open={preferencesOpen} onToggle={()=>setPreferencesOpen(open=>!open)}><PreferencesForm preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} onSubmit={savePreferences} saving={saving}/></SettingsDisclosure><SettingsDisclosure id="settings-security-v5" eyebrow="ACCOUNT SECURITY" title="Change password" icon={ShieldCheck} open={securityOpen} onToggle={()=>setSecurityOpen(open=>!open)}><form className="steel-card password-form" onSubmit={savePassword}><p className="settings-form-copy">Use your current password to confirm this change.</p><label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label><label><span>New password</span><input type="password" autoComplete="new-password" minLength="6" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></label><label><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength="6" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label><button className="gold-button" disabled={saving}><ShieldCheck size={17}/> {saving?'Updating…':'Update password'}</button></form></SettingsDisclosure><SettingsDisclosure id="settings-health-v5" eyebrow="HEALTH & WATCH SYNC" title="Step integrations" icon={Watch} open={healthSyncOpen} onToggle={()=>setHealthSyncOpen(open=>!open)}><article className="settings-security-card"><span className="settings-security-icon"><Watch size={22}/></span><div><h3>Step integrations planned</h3><p>Steel is prepared for daily step data. Next we can connect the appropriate native bridges for Apple Health, Android Health Connect/Google Fit-compatible apps, Samsung Health and supported watch ecosystems.</p></div></article><div className="health-provider-grid"><div className="health-provider"><strong>Apple Health</strong><span>iPhone + Apple Watch</span><small>Planned</small></div><div className="health-provider"><strong>Health Connect</strong><span>Android + compatible watches</span><small>Planned</small></div><div className="health-provider"><strong>Samsung Health</strong><span>Galaxy Watch ecosystem</span><small>Planned</small></div></div></SettingsDisclosure><article className="settings-security-card"><span className="settings-security-icon"><ShieldCheck size={22}/></span><div><span className="eyebrow">YOUR DATA</span><h3>Private by default</h3><p>Workout, weight, profile and step records remain scoped to your authenticated account.</p></div></article><section className="settings-support-card settings-support-footer" id="settings-support-v5"><div className="section-heading"><div><span className="eyebrow">NEED A HAND?</span><h3>Support</h3></div></div><div className="settings-support-list"><button type="button" onClick={()=>openSupportPanel('help')}><span><strong>Help &amp; Support</strong><small>Get help using Steel</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('about')}><span><strong>About Steel</strong><small>Learn more about the app</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('feedback')}><span><strong>Send feedback</strong><small>Tell us how Steel can improve</small></span><ChevronRight size={17}/></button></div></section></div>
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
  const [profile, setProfile] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [weightInput, setWeightInput] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState(user.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferences, setPreferences] = useState({ goal: 'Lose fat and gain muscle', experienceLevel: 'Intermediate', availableEquipment: ['Machines'], trainingDays: 3, units: 'lb', limitations: '', dietaryPreference: 'No preference', allergies: '', mealsPerDay: 3 })
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')
  const [progressOpen, setProgressOpen] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [supportPanel, setSupportPanel] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [healthSyncOpen, setHealthSyncOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  useEffect(() => {
    function syncTabFromUrl() {
      const requested = window.location.hash.replace(/^#/, '')
      const next = [...tabs.map(({ id }) => id), 'Settings'].includes(requested) ? requested : 'Home'
      setTab(next)
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
    const url = `${window.location.pathname}${window.location.search}#${valid}`
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }

  async function refresh() {
    const [programme, dashboard, todaySteps, stepHistoryRows, history, recent, profileRow] = await Promise.all([
      loadWorkouts(user.id), getDashboardStats(user.id), getTodaySteps(user.id),
      getStepHistory(user.id, 31),
      getWeightHistory(user.id, 30), getRecentSessions(user.id, 8), getProfile(user.id),
    ])
    setWorkouts(programme); setStats(dashboard); setSteps(todaySteps); setStepHistory(stepHistoryRows); setWeights(history); setSessions(recent); setProfile(profileRow)
    setPreferences({ goal: profileRow?.goal || 'Lose fat and gain muscle', experienceLevel: profileRow?.experience_level || 'Intermediate', availableEquipment: profileRow?.available_equipment?.length ? profileRow.available_equipment : ['Machines'], trainingDays: Number(profileRow?.training_days || 3), units: profileRow?.units || 'lb', limitations: profileRow?.limitations || '', dietaryPreference: profileRow?.dietary_preference || 'No preference', allergies: profileRow?.allergies || '', mealsPerDay: Number(profileRow?.meals_per_day || 3) })
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
  const totalSteps = stepHistory.reduce((total, item) => total + Number(item.steps || 0), 0)
  const todaySteps = Number(steps.steps || 0)
  const previousWeight = weights.length > 1 ? Number(weights.at(-2).weight_lb) : null
  const weightDelta = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null

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
  function openWorkout(workout) { setSelectedId(workout.id); setDraft(makeDraft(workout)); navigateToTab('Train'); setMessage('') }
  function changeWorkout(id) { const w = workouts.find((x) => x.id === id); if (w) { setSelectedId(id); setDraft(makeDraft(w)) } }
  function updateSet(exerciseId, setNo, patch) { setDraft((d) => ({ ...d, sets: { ...d.sets, [exerciseId]: d.sets[exerciseId].map((s) => s.setNo === setNo ? { ...s, ...patch } : s) } })) }
  function moveStep(step) { setDraft((d) => ({ ...d, step: Math.max(0, Math.min(step, activeExercises.length)) })) }
  function removeExercise(id) { setDraft((d) => ({ ...d, removedExercises: [...new Set([...d.removedExercises, id])], step: Math.min(d.step, activeExercises.length - 1) })) }
  function restoreExercise(id) { setDraft((d) => ({ ...d, removedExercises: d.removedExercises.filter((x) => x !== id) })) }

  const completedSets = selectedWorkout && draft ? selectedWorkout.exercises.reduce((total, exercise) => total + (draft.sets[exercise.id] || []).filter((s) => s.complete && !s.removed).length, 0) : 0

  async function saveSession() {
    if (!selectedWorkout || !draft || !completedSets) return
    setSaving(true)
    try { await saveWorkoutSession({ userId: user.id, workout: selectedWorkout, draft }); await refresh(); setDraft(makeDraft(selectedWorkout)); navigateToTab('Home'); setMessage(`Session saved — ${completedSets} sets logged.`) }
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
  if (!profile?.onboarding_completed && !onboardingDismissed) return <OnboardingFlow preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} onComplete={savePreferences} onSkip={() => { setOnboardingDismissed(true); setMessage('You can finish your setup any time in Settings.') }} saving={saving} onSignOut={onSignOut} />

  return <div className="steel-app">
    <main className="steel-screen">
      <header className="v2-topbar">
        <div className="brand-lockup"><div className="brand-emblem"><SteelMark /></div><div><div className="eyebrow">SPARTAN STRENGTH, EVERY DAY</div><h1>PROJECT <span>STEEL</span></h1></div></div>
        <button className={`account-button ${tab === 'Settings' ? 'active' : ''}`} onClick={openSettings}><Avatar url={avatarUrl} size={32} /><span className="account-copy"><strong>{accountName}</strong><small>Profile</small></span><ChevronRight size={15} /></button>
      </header>
      {message && <div className="toast-note">{message}</div>}

      {tab === 'Home' && <div className="page-stack home-page-stack">
        <section className="v4-welcome-card"><div className="v4-hero-art"><div className="v4-hero-figure" aria-hidden="true" /></div><div className="v4-hero-copy"><span className="eyebrow">WELCOME BACK,</span><h2>{firstName}</h2><p>You’ve got this. Let’s build something strong today.</p></div><div className="v4-metric-grid"><article><Dumbbell size={17}/><span>WORKOUTS</span><strong>{stats.sessionCount}</strong><small>Logged</small></article><article><Flame size={17}/><span>STREAK</span><strong>{stats.streakDays || 0}</strong><small>Days</small></article><article><Footprints size={17}/><span>STEPS</span><strong>{todaySteps.toLocaleString('en-GB')}</strong><small>Today</small></article><button type="button" className="v4-metric-link" onClick={() => navigateToTab('Weight')}><Scale size={17}/><span>WEIGHT</span><strong>{latestWeight ? latestWeight.toFixed(1) : '—'}</strong><small>lb</small></button></div></section>
        <section className="v4-quick-actions"><div className="section-heading"><div><span className="eyebrow">MAKE IT EASY</span><h3>Quick actions</h3></div></div><div className="v4-action-grid">{workouts[0]&&<button onClick={()=>openWorkout(workouts[0])}><Play/><span>Start workout</span></button>}{workouts[1]&&<button onClick={()=>openWorkout(workouts[1])}><Dumbbell/><span>Push workout</span></button>}<button onClick={()=>navigateToTab('Weight')}><Scale/><span>Log weight</span></button><button onClick={()=>setProgressOpen(true)}><ListChecks/><span>View progress</span></button></div></section>
        <section className={`steel-card movement-card ${stepHistory.length ? '' : 'is-empty'}`}><div className="movement-card-heading"><div><span className="eyebrow">MOVEMENT HISTORY</span><h3>Steps total</h3><span className="metric-label">Last 30 days</span></div><div className="step-total"><strong>{totalSteps.toLocaleString('en-GB')}</strong><small>steps logged</small></div></div><div className="movement-card-meta"><span>Today <strong>{Number(steps.steps || 0).toLocaleString('en-GB')}</strong>{steps.source ? ` · synced from ${steps.source}` : ''}</span><button className="text-link" onClick={() => navigateToTab('Progress')}>View progress <ChevronRight size={14}/></button></div><StepsChart data={stepHistory}/>{!stepHistory.length&&<button className="movement-empty-link" onClick={openSettings}><Settings size={14}/> Connect health data in Settings</button>}</section>
        <section className="home-workout-section"><div className="section-heading"><div><span className="eyebrow">YOUR PROGRAMME</span><h3>Choose a workout</h3></div><button className="text-link" onClick={() => navigateToTab('Plan')}>View all</button></div><div className="workout-tile-stack">{workouts.map((w, i) => <button className="workout-tile" key={w.id} onClick={() => openWorkout(w)}><div className={`tile-art tile-art-${i+1}`}><Dumbbell size={30}/></div><div className="tile-copy"><span className="eyebrow">WORKOUT {i+1}</span><strong>{w.name}</strong><small>{w.exercises.length} exercises · {w.duration}</small></div><span className="tile-arrow"><ChevronRight size={19}/></span></button>)}</div></section>
        <section className="v4-progress-section"><button className="v4-progress-heading" onClick={()=>setProgressOpen((open)=>!open)} aria-expanded={progressOpen}><span><span className="eyebrow">AT A GLANCE</span><strong>Progress</strong><small>Relative metrics</small></span><ChevronDown className={progressOpen?'rotated':''}/></button>{progressOpen&&<div className="steel-card v4-progress-card"><div className="v4-progress-top"><strong>This week</strong><span>{sessions.length} recent sessions</span></div><div className="v4-relative-metrics"><div><span>Weekly goal</span><strong>{Math.min(sessions.length,5)} / 5</strong></div><div><span>Check-ins</span><strong>{weights.length}</strong></div><div><span>Sessions total</span><strong>{stats.sessionCount}</strong></div></div></div>}</section>
      </div>}

      {tab === 'Plan' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">YOUR PROGRAMME</span><h2>Workouts</h2><p>Three focused sessions built around efficient machine-led training.</p></section>{workouts.map((w,i)=><article className="plan-block" key={w.id}><div className={`plan-image plan-image-${i+1}`}><div className="plan-image-icon"><Dumbbell size={34}/></div><span>WORKOUT {i+1}</span></div><div className="plan-content"><div className="plan-title-row"><div><h3>{w.name}</h3><p>{w.exercises.length} exercises · {w.duration}</p></div><button className="circle-button" onClick={()=>openWorkout(w)}><ArrowRight size={18}/></button></div><div className="compact-exercise-list">{w.exercises.map((e,n)=><div className="compact-exercise" key={e.id}><span>{n+1}</span><div><strong>{e.name}</strong><small>{e.equipment} · {e.sets} × {e.reps}</small></div></div>)}</div><div className="finisher-badge"><Flame size={15}/> {w.finisher}</div></div></article>)}</div>}

      {tab === 'Train' && <div className="page-stack training-page">{!selectedWorkout || !draft ? <section className="empty-state"><Dumbbell size={34}/><h2>Choose a workout</h2><p>Start from Home or Workouts.</p>{workouts[0]&&<button className="gold-button" onClick={()=>openWorkout(workouts[0])}>Start workout</button>}</section> : <><section className="train-top"><div><span className="eyebrow">ACTIVE WORKOUT</span><h2>{selectedWorkout.name}</h2></div><select value={selectedWorkout.id} onChange={(e)=>changeWorkout(e.target.value)}>{workouts.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></section><div className="train-progress-copy"><span>{atFinisher?'Final step':`Exercise ${draft.step+1} of ${activeExercises.length}`}</span><span>{Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%</span></div><div className="train-progress"><span style={{width:`${Math.round(((draft.step+1)/(activeExercises.length+1))*100)}%`}}/></div>{!atFinisher&&currentExercise&&<><article className="exercise-focus-card"><div className="exercise-visual"><Dumbbell size={48}/></div><div className="exercise-focus-copy"><span className="eyebrow">CURRENT EXERCISE</span><h2>{currentExercise.name}</h2><p>{currentExercise.equipment} · {currentExercise.sets} sets × {currentExercise.reps}</p></div></article><div className="set-list-v2">{(draft.sets[currentExercise.id]||[]).map(set=><article className={`set-row-v2 ${set.complete?'complete':''} ${set.removed?'removed':''}`} key={set.setNo}><div className="set-number">{set.setNo}</div>{!set.removed?<><label><span>KG</span><input type="number" min="0" step="2.5" value={set.weight} onChange={e=>updateSet(currentExercise.id,set.setNo,{weight:Number(e.target.value)||0})}/></label><label><span>REPS</span><input type="number" min="1" value={set.reps} onChange={e=>updateSet(currentExercise.id,set.setNo,{reps:Number(e.target.value)||1})}/></label><div className="set-actions-v2"><button className={set.complete?'done-button done':'done-button'} onClick={()=>updateSet(currentExercise.id,set.setNo,{complete:!set.complete})}><Check size={16}/> {set.complete?'Done':'Complete'}</button><button className="remove-button" onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:true,complete:false})}><Trash2 size={15}/> Remove</button></div></>:<div className="removed-copy"><span>Removed</span><button onClick={()=>updateSet(currentExercise.id,set.setNo,{removed:false})}><RotateCcw size={15}/> Restore</button></div>}</article>)}</div><details className="options-panel"><summary>Exercise options</summary><button className="danger-link" onClick={()=>removeExercise(currentExercise.id)}><Trash2 size={16}/> Remove exercise this session</button></details><div className="train-nav-row"><button disabled={draft.step===0} onClick={()=>moveStep(draft.step-1)}><ArrowLeft size={17}/> Previous</button><button className="gold-button" onClick={()=>moveStep(draft.step+1)}>{draft.step===activeExercises.length-1?'Finisher':'Next'} <ArrowRight size={17}/></button></div></>}{atFinisher&&<><article className="finisher-panel"><div className="finisher-symbol"><Flame size={24}/></div><div><span className="eyebrow">FINISH STRONG</span><h2>Incline cardio</h2><p>7 min · 6% incline · RPE 6</p></div></article><article className="session-summary-v2"><div className="summary-hero"><Check size={20}/><div><span className="eyebrow">SESSION SUMMARY</span><strong>{completedSets} working sets</strong></div></div></article>{draft.removedExercises.length>0&&<details className="options-panel"><summary>Restore removed exercises</summary>{draft.removedExercises.map(id=>{const e=selectedWorkout.exercises.find(x=>x.id===id);return e?<button className="restore-exercise" key={id} onClick={()=>restoreExercise(id)}><RotateCcw size={14}/> {e.name}</button>:null})}</details>}<div className="train-nav-row"><button onClick={()=>moveStep(Math.max(activeExercises.length-1,0))}><ArrowLeft size={17}/> Back</button><button className="gold-button" disabled={!completedSets||saving} onClick={saveSession}><Save size={17}/> {saving?'Saving…':'Save session'}</button></div></>}</>}</div>}

      {tab === 'Progress' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">PROGRESS</span><h2>Your momentum</h2><p>Training consistency and recent sessions without clutter.</p></section><article className="progress-hero-card"><div className="progress-metric"><span className="eyebrow">WORKOUTS LOGGED</span><strong>{stats.sessionCount}</strong><small>Keep stacking sessions.</small></div></article><section className="steel-card"><div className="section-heading"><div><span className="eyebrow">RECENT SESSIONS</span><h3>Training history</h3></div><Dumbbell size={20}/></div>{sessions.length?sessions.map(s=><div className="history-row session-history" key={s.id}><div><strong>{s.workout_name}</strong><span>{formatDate(s.session_date)}</span></div><small>{s.duration_min||45} min</small></div>):<p className="muted-copy">Completed sessions will appear here.</p>}</section></div>}

      {tab === 'Weight' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">WEIGHT</span><h2>Body weight</h2><p>Quick check-ins in lbs with a clean trend view.</p></section><article className="progress-hero-card"><div className="progress-metric"><span className="eyebrow">CURRENT WEIGHT</span><strong>{latestWeight?`${latestWeight.toFixed(1)} lb`:'— lb'}</strong><small>{weightDelta===null?'No comparison yet':`${weightDelta>0?'+':''}${weightDelta.toFixed(1)} lb vs previous`}</small></div><WeightChart data={weights}/></article><form className="weight-entry-card" onSubmit={submitWeight}><div><span className="eyebrow">TODAY</span><h3>Log weight</h3></div><div className="weight-entry-row"><label><input type="number" min="60" max="700" step=".1" placeholder={latestWeight?latestWeight.toFixed(1):'Weight'} value={weightInput} onChange={e=>setWeightInput(e.target.value)}/><span>lb</span></label><button className="gold-button" disabled={saving||!weightInput}><Save size={17}/> Save</button></div></form><section className="steel-card"><div className="section-heading"><div><span className="eyebrow">HISTORY</span><h3>Recent check-ins</h3></div><Scale size={20}/></div>{weights.length?[...weights].reverse().slice(0,8).map(w=><div className="history-row" key={w.id}><span>{formatDate(w.checkin_date)}</span><strong>{Number(w.weight_lb).toFixed(1)} lb</strong></div>):<p className="muted-copy">No check-ins yet.</p>}</section></div>}

      {tab === 'Settings' && <div className="page-stack settings-page"><button className="settings-back-button" type="button" onClick={closeSettings}><ArrowLeft size={17}/> Back</button><section className="page-intro"><span className="eyebrow">PROFILE & SETTINGS</span><h2>Your Steel profile</h2><p>Personalise your account and prepare health syncing.</p><button className="settings-support-jump" type="button" onClick={() => document.getElementById('settings-support')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span>Need help?</span><strong>Support &amp; feedback</strong><ChevronRight size={15}/></button></section><article className="settings-profile-card editable-profile"><div className="avatar-upload-wrap"><Avatar url={avatarUrl} size={72}/><label className="avatar-upload-button"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} disabled={avatarBusy}/></label></div><div><span className="eyebrow">DISPLAY PROFILE</span><h3>{accountName}</h3><p>{avatarBusy?'Uploading photo…':user.email}</p></div></article><form className="steel-card profile-form" onSubmit={saveAccount}><label><span>Name</span><input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></label><label><span>Email</span><input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} required/></label><button className="gold-button" disabled={saving}><Save size={17}/> {saving?'Saving…':'Save profile'}</button></form><form className="steel-card password-form" onSubmit={savePassword}><div className="settings-form-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h3>Change password</h3></div><ShieldCheck size={20}/></div><p className="settings-form-copy">Use your current password to confirm this change.</p><label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label><label><span>New password</span><input type="password" autoComplete="new-password" minLength="6" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></label><label><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength="6" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></label><button className="gold-button" disabled={saving}><ShieldCheck size={17}/> {saving?'Updating…':'Update password'}</button></form><article className="settings-security-card"><span className="settings-security-icon"><Watch size={22}/></span><div><span className="eyebrow">HEALTH & WATCH SYNC</span><h3>Step integrations planned</h3><p>Steel is prepared for daily step data. Next we can connect the appropriate native bridges for Apple Health, Android Health Connect/Google Fit-compatible apps, Samsung Health and supported watch ecosystems.</p></div></article><div className="health-provider-grid"><div className="health-provider"><strong>Apple Health</strong><span>iPhone + Apple Watch</span><small>Planned</small></div><div className="health-provider"><strong>Health Connect</strong><span>Android + compatible watches</span><small>Planned</small></div><div className="health-provider"><strong>Samsung Health</strong><span>Galaxy Watch ecosystem</span><small>Planned</small></div></div><article className="settings-security-card"><span className="settings-security-icon"><ShieldCheck size={22}/></span><div><span className="eyebrow">YOUR DATA</span><h3>Private by default</h3><p>Workout, weight, profile and step records remain scoped to your authenticated account.</p></div></article><section className="settings-support-card" id="settings-support"><div className="section-heading"><div><span className="eyebrow">NEED A HAND?</span><h3>Support</h3></div></div><div className="settings-support-list"><button type="button" onClick={()=>openSupportPanel('help')}><span><strong>Help &amp; Support</strong><small>Get help using Steel</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('about')}><span><strong>About Steel</strong><small>Learn more about the app</small></span><ChevronRight size={17}/></button><button type="button" onClick={()=>openSupportPanel('feedback')}><span><strong>Send feedback</strong><small>Tell us how Steel can improve</small></span><ChevronRight size={17}/></button></div></section><button className="signout-button" onClick={onSignOut}><LogOut size={18}/> Sign out of Project Steel</button></div>}
      {tab === 'Settings' && <SettingsPage user={user} onSignOut={onSignOut} closeSettings={closeSettings} accountName={accountName} avatarUrl={avatarUrl} profileName={profileName} setProfileName={setProfileName} profileEmail={profileEmail} setProfileEmail={setProfileEmail} saveAccount={saveAccount} handleAvatar={handleAvatar} avatarBusy={avatarBusy} currentPassword={currentPassword} setCurrentPassword={setCurrentPassword} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} savePassword={savePassword} saving={saving} preferences={preferences} setPreferences={setPreferences} toggleEquipment={toggleEquipment} savePreferences={savePreferences} openSupportPanel={openSupportPanel}/>}
      {supportPanel && <div className="support-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSupportPanel() }}><section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-dialog-title"><button className="support-dialog-close" type="button" aria-label="Close support panel" onClick={closeSupportPanel}>×</button>{supportPanel === 'help' && <><div className="support-dialog-icon"><HelpCircle size={22}/></div><span className="eyebrow">STEEL HELP</span><h2 id="support-dialog-title">Train with confidence</h2><p>Choose a workout from Home or Workouts, complete each set, then save the session at the end. Your logged sessions, weight and steps feed the Progress view.</p><div className="support-help-list"><div><strong>Can’t see your steps?</strong><span>Open Settings and connect a supported health provider when integrations are enabled.</span></div><div><strong>Need to change your plan?</strong><span>Start with your goal and equipment preferences; personalised journeys are coming next.</span></div><div><strong>Something went wrong?</strong><span>Refresh once, then check that you are signed in to the correct Steel account.</span></div></div></>}{supportPanel === 'about' && <><div className="support-dialog-icon"><Info size={22}/></div><span className="eyebrow">ABOUT PROJECT STEEL</span><h2 id="support-dialog-title">Your training homebase</h2><p>Project Steel is a private, mobile-first training space for workouts, progress, body-weight check-ins and daily movement.</p><div className="support-about-points"><span>Private account data protected by Supabase authentication and row-level security.</span><span>Spartan-inspired guidance designed to make consistent training feel clear and achievable.</span><span>AI trainer, meal planning and connected fitness journeys are part of the wider roadmap.</span></div></>}{supportPanel === 'feedback' && <><div className="support-dialog-icon"><MessageSquare size={22}/></div><span className="eyebrow">SHAPE THE NEXT RELEASE</span><h2 id="support-dialog-title">Send feedback</h2>{feedbackSaved ? <div className="support-feedback-success"><strong>Thanks — your feedback is captured for this session.</strong><button className="gold-button" type="button" onClick={() => setFeedbackSaved(false)}>Add more feedback</button></div> : <form className="support-feedback-form" onSubmit={saveFeedback}><label htmlFor="steel-feedback">What should Steel improve next?</label><textarea id="steel-feedback" value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} placeholder="Tell us what would make your next session easier…" rows="5" required/><button className="gold-button" type="submit" disabled={!feedbackText.trim()}>Save feedback</button></form>}</>}{supportPanel !== 'feedback' && <button className="gold-button support-dialog-action" type="button" onClick={closeSupportPanel}>Back to Settings</button>}</section></div>}
    </main>
    <nav className="v2-bottom-nav" aria-label="Project Steel navigation">{tabs.map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>navigateToTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
    <nav className="v4-desktop-nav" aria-label="Project Steel desktop navigation"><div className="v4-desktop-brand"><div className="brand-emblem"><SteelMark size={22}/></div><strong>PROJECT STEEL</strong></div>{tabs.filter(({id})=>id!=='Train').map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>navigateToTab(id)}><Icon size={20}/><span>{label}</span></button>)}<button className={tab==='Settings'?'active':''} onClick={openSettings}><Settings size={20}/><span>Settings</span></button><div className="v4-desktop-support"><span className="eyebrow">SUPPORT</span><button onClick={openSettings}>Help &amp; Support <ChevronRight size={15}/></button><button onClick={openSettings}>About Steel <ChevronRight size={15}/></button></div></nav>
  </div>
}
