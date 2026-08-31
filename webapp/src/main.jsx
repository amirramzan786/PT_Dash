import React from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from './AuthGate'
import './styles.css'
import './settings.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>,
)
