import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Decimal from 'decimal.js'
import './index.css'
import { install as installErrorOverlay } from './console-error-overlay.ts'
import App from './App.tsx'

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_FLOOR,
  toExpNeg: -40,
  toExpPos: 40,
});

installErrorOverlay();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
