import { Calendar, Home, Dumbbell, MessageSquare, Settings, Clock, FileDown, CalendarCheck } from 'lucide-react'
import { Button } from './ui/button'
import { Link, useLocation } from 'react-router-dom'
import { InstallPWA } from './InstallPWA'
import { LiveClock } from './LiveClock'
import { useUIStore } from '@/state/useUIStore'
import { useEffect, useState } from 'react'
import '../styles/aesthetic-enhancements.css'
import '../styles/responsive-system.css'
import '../styles/navigation-buttons.css'

interface HeaderProps {
  onJumpToNow?: () => void
  onExport?: () => void
}

export function Header({ onJumpToNow, onExport }: HeaderProps) {
  const location = useLocation()
  const { theme, setTheme } = useUIStore()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    localStorage.setItem('theme', newTheme)
  }
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/schedule', icon: CalendarCheck, label: 'Schedule' },
    { path: '/workflows', icon: MessageSquare, label: 'Workflows' },
    { path: '/fitness', icon: Dumbbell, label: 'Fitness' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ]
  
  return (
    <header className="header-clean border-b sticky top-0 z-40" style={{ borderColor: 'var(--border-color)' }}>
      <div className="header-wave-bg" />
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <h1 className="header-title text-crisp">
              TREY'S DASHBOARD
            </h1>
          </div>
          
          <div className="hidden md:block">
            <LiveClock />
          </div>
          
          <nav className="nav-responsive no-print">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} className="nav-item">
                <button
                  className={`nav-button ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <item.icon className="nav-button-icon w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </Link>
            ))}
            
            {location.pathname === '/' && (
              <>
                <button
                  onClick={onJumpToNow}
                  className="nav-button nav-button-special"
                >
                  <Clock className="nav-button-icon w-4 h-4" />
                  <span className="font-medium">Jump to Now</span>
                </button>
                
                <button
                  onClick={onExport}
                  className="nav-button nav-button-special"
                >
                  <FileDown className="nav-button-icon w-4 h-4" />
                  <span>Export</span>
                </button>
              </>
            )}
            
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className={`theme-toggle ${theme === 'light' ? 'light' : ''}`}
                aria-label="Toggle theme"
              />
            )}
            
            <InstallPWA />
          </nav>
        </div>
      </div>
    </header>
  )
}