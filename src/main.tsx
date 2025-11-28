import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Basic mount log for troubleshooting black screen
console.log('[LinearAlgebraEditor] Booting app...')

try {
  const el = document.getElementById('root')
  if (!el) {
    throw new Error('Root element #root not found')
  }
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('[LinearAlgebraEditor] App mounted')
} catch (err) {
  console.error('[LinearAlgebraEditor] Mount error:', err)
  const el = document.getElementById('root')
  if (el) {
    el.innerText = 'Failed to load editor. See console for details.'
  }
}
