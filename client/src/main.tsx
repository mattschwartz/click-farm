import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { install as installErrorOverlay } from './console-error-overlay.ts'
import App from './App.tsx'

installErrorOverlay();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
