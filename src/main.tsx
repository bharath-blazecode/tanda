// Fonts are served from our own origin (DESIGN.md): no third-party host on mobile data.
import '@fontsource/big-shoulders-display/latin-700'
import '@fontsource/big-shoulders-display/latin-900'
import '@fontsource/courier-prime/latin-400'
import '@fontsource/courier-prime/latin-700'
import './ui/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
