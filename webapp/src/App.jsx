import { useMemo, useState } from 'react'
import { Dumbbell, Flame, Home, LineChart, Salad, Scale, Target } from 'lucide-react'

const workouts = [
  { name: 'Back + Biceps', detail: '6 exercises · ~45 min' },
  { name: 'Chest + Triceps', detail: '6 exercises · ~45 min' },
  { name: 'Shoulders + Legs', detail: '6 exercises · ~45 min' },
]

const tabs = [
  { id: 'Home', icon: Home },
  { id: 'Plan', icon: Target },
  { id: 'Train', icon: Dumbbell },
  { id: 'Nutrition', icon: Salad },
  { id: 'Progress', icon: LineChart },
]

function App() {
  const [tab, setTab] = useState('Home')
  const current = useMemo(() => workouts[0], [])

  return (
    <div className="app-shell">
      <main className="screen">
        <header className="topbar">
          <div>
            <div className="eyebrow">PERSONAL TRAINING SYSTEM</div>
            <h1>PROJECT <span>STEEL</span></h1>
          </div>
          <div className="mark">PS</div>
        </header>

        {tab === 'Home' && (
          <>
            <section className="hero-card">
              <div>
                <div className="muted">TODAY</div>
                <h2>Build strength.<br />Build consistency.</h2>
                <p>Your next session is ready.</p>
              </div>
              <Flame size={42} />
            </section>

            <section className="metric-grid">
              <article className="card metric-card">
                <Scale size={20} />
                <div className="muted">BODY WEIGHT</div>
                <strong>— lb</strong>
                <small>Latest check-in</small>
              </article>
              <article className="card metric-card">
                <Dumbbell size={20} />
                <div className="muted">SESSIONS</div>
                <strong>0</strong>
                <small>Logged workouts</small>
              </article>
            </section>

            <section>
              <div className="section-head">
                <h3>Today’s workout</h3>
                <button className="text-button" onClick={() => setTab('Plan')}>View plan</button>
              </div>
              <article className="card workout-card">
                <div>
                  <div className="muted">WORKOUT 1</div>
                  <h2>{current.name}</h2>
                  <p>{current.detail} · + 5–10 min incline walk</p>
                </div>
                <button className="primary" onClick={() => setTab('Train')}>Start workout</button>
              </article>
            </section>

            <section className="card nutrition-preview">
              <div className="section-head">
                <div>
                  <div className="muted">NUTRITION</div>
                  <h3>Daily targets</h3>
                </div>
                <button className="text-button" onClick={() => setTab('Nutrition')}>Open</button>
              </div>
              <div className="nutrition-stats">
                <div><strong>—</strong><span>Calories</span></div>
                <div><strong>— g</strong><span>Protein</span></div>
              </div>
            </section>
          </>
        )}

        {tab !== 'Home' && (
          <section className="placeholder">
            <div className="placeholder-icon">
              {tab === 'Plan' && <Target />}
              {tab === 'Train' && <Dumbbell />}
              {tab === 'Nutrition' && <Salad />}
              {tab === 'Progress' && <LineChart />}
            </div>
            <div className="muted">MIGRATION PHASE</div>
            <h2>{tab}</h2>
            <p>The React foundation is live. This screen is next to be migrated from the current Steel app.</p>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Project Steel navigation">
        {tabs.map(({ id, icon: Icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={20} />
            <span>{id}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
