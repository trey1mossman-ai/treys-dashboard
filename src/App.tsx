import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { InstallPWA } from '@/components/InstallPWA'
import { AssistantDock } from '@/features/assistant/AssistantDock'
import { UniversalCommand } from '@/components/UniversalCommand'
import { ProactiveAssistant } from '@/components/ProactiveAssistant'
import { useUIStore } from '@/state/useUIStore'
import { exportToPDF } from '@/lib/export'
import { autoPilot } from '@/lib/automation/autopilot'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'
function App() {
  const { setTheme } = useUIStore()
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      setTheme('dark')
    }
  }, [setTheme])
  
  // Initialize Life OS components
  useEffect(() => {
    const initializeLifeOS = async () => {
      try {
        console.log('Initializing Life OS...')
        
        // Initialize AutoPilot
        await autoPilot.initialize()
        
        // Start performance monitoring
        performanceMonitor.trackTimeSaved(0, 'system_startup')
        
        console.log('Life OS initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Life OS:', error)
      }
    }
    
    initializeLifeOS()
    
    // Cleanup on unmount
    return () => {
      autoPilot.stop()
    }
  }, [])
  
  const handleJumpToNow = () => {
    window.dispatchEvent(new CustomEvent('jumpToNow'))
  }
  
  const handleExport = () => {
    // For now, export to PDF. In the future, we can add a dialog to choose format
    exportToPDF()
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onJumpToNow={handleJumpToNow} onExport={handleExport} />
      <main>
        <Outlet />
      </main>
      <InstallPWA />
      <AssistantDock />
      <UniversalCommand />
      <ProactiveAssistant />
    </div>
  )
}

export default App
