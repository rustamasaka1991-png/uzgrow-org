import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Shriftlar sahifa chizilishini to'xtatmasin: HTML'da emas, ilova ishga tushgach ulanadi
const font = document.createElement('link')
font.rel = 'stylesheet'
font.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Golos+Text:wght@400;500;600;700&display=swap'
document.head.appendChild(font)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
