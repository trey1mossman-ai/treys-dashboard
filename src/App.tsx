import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { AIDock } from '@/components/AIDock'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { exportToPDF } from '@/lib/export'
import './styles/aesthetic-enhancements.css'
import './styles/responsive-system.css'
import './styles/theme-variations.css'

function App() {
  
  useEffect(() => {
    // Initialize with dark theme by default
    const savedTheme = localStorage.getItem('app-theme') || 'dark'
    document.documentElement.classList.add(`theme-${savedTheme}`)
  }, [])
  
  const handleJumpToNow = () => {
    window.dispatchEvent(new CustomEvent('jumpToNow'))
  }
  
  const handleExport = () => {
    exportToPDF()
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ backgroundColor: 'var(--background)' }}>
      <Header onJumpToNow={handleJumpToNow} onExport={handleExport} />
      
      {/* Theme Switcher - Top Right */}
      <div className="fixed top-20 right-4 z-50">
        <ThemeSwitcher />
      </div>
      
      <main className="relative page-container">
        <Outlet />
      </main>
      
      {/* AI Assistant Dock - Always Available */}
      <AIDock />
    </div>
  )
}

export default App