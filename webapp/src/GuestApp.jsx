import { useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ChevronRight, Dumbbell, Flame, Footprints, Home, LineChart, ListChecks, LogOut, Play, Salad, Scale, Target, Trophy } from 'lucide-react'
import { workouts } from './workoutData'
import './app-v2.css'
import SteelMark from './components/SteelMark'

const tabs = [
  { id: 'Home', icon: Home },
  { id: 'Plan', icon: Target },
  { id: 'Train', icon: Dumbbell },
  { id: 'Nutrition', icon: Salad },
  { id: 'Progress', icon: LineChart },
]

const demoWeights = [
  { id: 1, checkin_date: '2026-08-03', weight_lb: 188.4 },
  { id: 2, checkin_date: '2026-08-10', weight_lb: 187.2 },
  { id: 3, checkin_date: '2026-08-17', weight_lb: 185.9 },
  { id: 4, checkin_date: '2026-08-24', weight_lb: 184.8 },
  { id: 5, checkin_date: '2026-08-31', weight_lb: 183.9 },
]

const demoSteps = [4200, 6150, 7320, 5100, 8840, 6240, 7100, 5600, 4920, 8200, 9300, 6880, 7410, 6250, 8020, 5640, 7200, 6180, 9450, 7040, 6300, 8120, 7680, 5920, 6840, 7590, 6240, 7100, 8320, 6240]

function MiniChart() {
  const values = demoWeights.map((x) => x.weight_lb)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const points = values.map((value, index) => `${(index/(values.length-1))*100},${88-((value-min)/(max-min||1))*68}`).join(' ')
  return <svg className="weight-chart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline className="chart-line" points={points} /></svg>
}

function DemoStepsChart() {
  const max = Math.max(...demoSteps, 1)
  const points = demoSteps.map((value, index) => `${(index / (demoSteps.length - 1)) * 100},${88 - (value / max) * 68}`).join(' ')
  return <svg className="steps-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Demo steps over the last 30 days"><polyline className="chart-line" points={points} /></svg>
}

export default function GuestApp({ onExit }) {
  const [tab, setTab] = useState('Home')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(workouts[0].id)
  const selectedWorkout = useMemo(() => workouts.find((w) => w.id === selectedWorkoutId) || workouts[0], [selectedWorkoutId])
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState({})
  const [progressOpen, setProgressOpen] = useState(false)
  const currentExercise = selectedWorkout.exercises[Math.min(step, selectedWorkout.exercises.length - 1)]

  function openWorkout(workout) {
    setSelectedWorkoutId(workout.id)
    setStep(0)
    setCompleted({})
    setTab('Train')
  }

  return (
    <div className="steel-app">
      <main className="steel-screen">
        <header className="v2-topbar">
          <div className="brand-lockup"><div className="brand-emblem"><SteelMark /></div><div><div className="eyebrow">GUEST DEMO</div><h1>PROJECT <span>STEEL</span></h1></div></div>
          <button className="ghost-icon" onClick={onExit} aria-label="Exit guest mode"><LogOut size={18} /></button>
        </header>
        <div className="toast-note">Guest mode · demo data only · your private account is untouched</div>

        {tab === 'Home' && <div className="page-stack home-page-stack">
          <section className="v4-welcome-card"><div className="v4-hero-art"><div className="v4-hero-figure" aria-hidden="true" /></div><div className="v4-hero-copy"><span className="eyebrow">WELCOME BACK,</span><h2>Guest</h2><p>You’ve got this. Let’s build something strong today.</p></div><div className="v4-metric-grid"><article><Dumbbell size={17}/><span>WORKOUTS</span><strong>12</strong><small>This month</small></article><article><Flame size={17}/><span>STREAK</span><strong>7</strong><small>Days</small></article><article><Footprints size={17}/><span>STEPS</span><strong>6,240</strong><small>Today</small></article><button type="button" className="v4-metric-link" onClick={() => setTab('Progress')}><Scale size={17}/><span>WEIGHT</span><strong>183.9</strong><small>lb</small></button></div></section>
          <section className="v4-quick-actions"><div className="section-heading"><div><span className="eyebrow">MAKE IT EASY</span><h3>Quick actions</h3></div></div><div className="v4-action-grid"><button onClick={()=>openWorkout(workouts[0])}><Play/><span>Start workout</span></button><button onClick={()=>openWorkout(workouts[1])}><Dumbbell/><span>Push workout</span></button><button onClick={()=>setTab('Progress')}><Scale/><span>Log weight</span></button><button onClick={()=>setTab('Progress')}><ListChecks/><span>View progress</span></button></div></section>
          <section className="steel-card movement-card"><div className="movement-card-heading"><div><span className="eyebrow">MOVEMENT HISTORY</span><h3>Steps total</h3><span className="metric-label">Last 30 days</span></div><div className="step-total"><strong>{demoSteps.reduce((total, value) => total + value, 0).toLocaleString('en-GB')}</strong><small>steps logged</small></div></div><div className="movement-card-meta"><span>Today <strong>6,240</strong> · demo data</span><button className="text-link" onClick={() => setTab('Progress')}>View progress <ChevronRight size={14}/></button></div><DemoStepsChart /></section>
          <section className="home-workout-section"><div className="section-heading"><div><span className="eyebrow">DEMO PROGRAMME</span><h3>Choose a workout</h3></div><button className="text-link" onClick={() => setTab('Plan')}>View all</button></div><div className="workout-tile-stack">{workouts.map((workout,index)=><button className="workout-tile" key={workout.id} onClick={()=>openWorkout(workout)}><div className={`tile-art tile-art-${index+1}`}><Dumbbell size={30}/></div><div className="tile-copy"><span className="eyebrow">WORKOUT {index+1}</span><strong>{workout.name}</strong><small>{workout.exercises.length} exercises · {workout.duration}</small></div><span className="tile-arrow"><ChevronRight size={19}/></span></button>)}</div></section>
          <section className="v4-progress-section"><button className="v4-progress-heading" onClick={()=>setProgressOpen((open)=>!open)} aria-expanded={progressOpen}><span><span className="eyebrow">AT A GLANCE</span><strong>Progress</strong><small>Demo relative metrics</small></span><ChevronDown className={progressOpen?'rotated':''}/></button>{progressOpen&&<div className="steel-card v4-progress-card"><div className="v4-progress-top"><strong>This week</strong><span>4 recent sessions</span></div><div className="v4-relative-metrics"><div><span>Weekly goal</span><strong>4 / 5</strong></div><div><span>Check-ins</span><strong>5</strong></div><div><span>Sessions total</span><strong>12</strong></div></div></div>}</section>
        </div>}

        {tab === 'Plan' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">GUEST PROGRAMME</span><h2>Training plan</h2><p>The same three-session Steel split, shown with demo data.</p></section>{workouts.map((workout,index)=><article className="plan-block" key={workout.id}><div className={`plan-image plan-image-${index+1}`}><div className="plan-image-icon"><Dumbbell size={34}/></div><span>WORKOUT {index+1}</span></div><div className="plan-content"><div className="plan-title-row"><div><h3>{workout.name}</h3><p>{workout.exercises.length} exercises · {workout.duration}</p></div><button className="circle-button" onClick={()=>openWorkout(workout)}><ArrowRight size={18}/></button></div><div className="compact-exercise-list">{workout.exercises.map((exercise,i)=><div className="compact-exercise" key={exercise.id}><span>{i+1}</span><div><strong>{exercise.name}</strong><small>{exercise.equipment} · {exercise.sets} × {exercise.reps}</small></div></div>)}</div><div className="finisher-badge"><Flame size={15}/> {workout.finisher}</div></div></article>)}</div>}

        {tab === 'Train' && <div className="page-stack training-page"><section className="train-top"><div><span className="eyebrow">DEMO WORKOUT</span><h2>{selectedWorkout.name}</h2></div><select value={selectedWorkoutId} onChange={(e)=>{setSelectedWorkoutId(e.target.value);setStep(0);setCompleted({})}}>{workouts.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></section><div className="train-progress-copy"><span>Exercise {step+1} of {selectedWorkout.exercises.length}</span><span>{Math.round(((step+1)/selectedWorkout.exercises.length)*100)}%</span></div><div className="train-progress"><span style={{width:`${Math.round(((step+1)/selectedWorkout.exercises.length)*100)}%`}}/></div><article className="exercise-focus-card"><div className="exercise-visual"><Dumbbell size={48}/></div><div className="exercise-focus-copy"><span className="eyebrow">CURRENT EXERCISE</span><h2>{currentExercise.name}</h2><p>{currentExercise.equipment} · {currentExercise.sets} sets × {currentExercise.reps}</p></div></article><div className="set-list-v2">{Array.from({length:currentExercise.sets},(_,i)=>{const key=`${currentExercise.id}-${i+1}`;return <article className={`set-row-v2 ${completed[key]?'complete':''}`} key={key}><div className="set-number">{i+1}</div><label><span>KG</span><input type="number" defaultValue={i===0?30:32.5} step="2.5"/></label><label><span>REPS</span><input type="number" defaultValue={10}/></label><div className="set-actions-v2"><button className={completed[key]?'done-button done':'done-button'} onClick={()=>setCompleted(c=>({...c,[key]:!c[key]}))}><Check size={16}/> {completed[key]?'Done':'Complete'}</button></div></article>})}</div><div className="train-nav-row"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Previous</button><button className="gold-button" onClick={()=>setStep(s=>Math.min(selectedWorkout.exercises.length-1,s+1))}>{step===selectedWorkout.exercises.length-1?'Demo complete':'Next exercise'} <ArrowRight size={17}/></button></div></div>}

        {tab === 'Nutrition' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">DEMO NUTRITION</span><h2>Nutrition</h2><p>Preview of Steel’s simple nutrition experience.</p></section><article className="nutrition-hero"><div className="macro-orb"><span>2,050</span><small>kcal</small></div><div><span className="eyebrow">DAILY TARGET</span><h3>2,300 kcal · 170g protein</h3><p>Demo targets only.</p></div></article></div>}

        {tab === 'Progress' && <div className="page-stack"><section className="page-intro"><span className="eyebrow">DEMO PROGRESS</span><h2>Progress</h2><p>Sample body-weight and training data.</p></section><article className="progress-hero-card"><div className="progress-metric"><span className="eyebrow">CURRENT WEIGHT</span><strong>183.9 lb</strong><small>−4.5 lb across demo period</small></div><MiniChart/></article><section className="steel-card"><div className="section-heading"><div><span className="eyebrow">RECENT CHECK-INS</span><h3>Weight history</h3></div><Scale size={20}/></div>{[...demoWeights].reverse().map(row=><div className="history-row" key={row.id}><span>{row.checkin_date}</span><strong>{row.weight_lb.toFixed(1)} lb</strong></div>)}</section></div>}
      </main>
      <nav className="v2-bottom-nav" aria-label="Project Steel guest navigation">{tabs.map(({id,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={20}/><span>{id}</span></button>)}</nav>
    </div>
  )
}
