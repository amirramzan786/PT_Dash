import React from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from './AuthGate'
import SteelMark from './components/SteelMark'
import './styles.css'
import './settings.css'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <main className="auth-shell"><section className="auth-card"><div className="auth-mark"><SteelMark size={30}/></div><div className="eyebrow">STEEL IS TEMPORARILY OFFLINE</div><h1>We couldn’t open the app</h1><p>Refresh the page and try again. Your account data is still safe.</p><button className="primary" type="button" onClick={() => window.location.reload()}>Reload Project Steel</button></section></main>
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary><AuthGate /></AppErrorBoundary>
  </React.StrictMode>,
)
