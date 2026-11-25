import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './context'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Outside the router so a toast outlives the navigation that follows it. */}
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
