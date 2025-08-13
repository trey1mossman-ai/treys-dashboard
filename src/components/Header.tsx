import { Calendar, Home, Dumbbell, MessageSquare, Settings, Clock, FileDown } from 'lucide-react'
import { Button } from './ui/button'
import { Link, useLocation } from 'react-router-dom'
import { InstallPWA } from './InstallPWA'

interface HeaderProps {
  onJumpToNow?: () => void
  onExport?: () => void
}

export function Header({ onJumpToNow, onExport }: HeaderProps) {
  const location = useLocation()
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/workflows', icon: MessageSquare, label: 'Workflows' },
    { path: '/fitness', icon: Dumbbell, label: 'Fitness' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ]
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
                  className="gap-2"
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
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 hover-glow"
                >
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="hidden md:inline font-medium">Jump to Now</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  className="gap-2 hover-glow"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden md:inline">Export</span>
                </Button>
              </>
            )}
            
            <InstallPWA />
          </nav>
        </div>
      </div>
    </header>
  )
}