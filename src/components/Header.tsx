import { Calendar, Home, Dumbbell, MessageSquare, Settings, Clock, FileDown } from 'lucide-react'
import { Button } from './ui/button'
import { Link, useLocation } from 'react-router-dom'
import { InstallPWA } from './InstallPWA'
import { useUIStore } from '@/state/useUIStore'
import { useEffect, useState } from 'react'
import '../styles/aesthetic-enhancements.css'

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
    { path: '/workflows', icon: MessageSquare, label: 'Workflows' },
    { path: '/fitness', icon: Dumbbell, label: 'Fitness' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ]
  
  return (
    <header className="border-b border-border glass-morphism-enhanced sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black wave-logo floating">
              Agenda Dashboard
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {today}
            </div>
          </div>
          
          <nav className="flex items-center gap-2 no-print">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? 'default' : 'ghost'}
                  size="sm"
                  className={`gap-2 ${location.pathname === item.path ? 'shiny-button' : 'glass-morphism-enhanced hover-glow'}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
            
            {location.pathname === '/' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onJumpToNow}
                  className="gap-2 shiny-button pulse-ring"
                >
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="hidden md:inline font-medium">Jump to Now</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  className="gap-2 glass-morphism-enhanced hover-glow reactive-hover"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden md:inline">Export</span>
                </Button>
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