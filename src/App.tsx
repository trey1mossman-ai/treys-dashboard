import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { InstallPWA } from '@/components/InstallPWA'
import { AssistantDock } from '@/features/assistant/AssistantDock'
import { UniversalCommand } from '@/components/UniversalCommand'
import { ProactiveAssistant } from '@/components/ProactiveAssistant'
import { ChatInterface } from '@/components/ChatInterface'
import { AICommandPalette } from '@/components/AICommandPalette'
import { MobileAIChat } from '@/components/MobileAIChat'
import { useUIStore } from '@/state/useUIStore'
import { exportToPDF } from '@/lib/export'
import { autoPilot } from '@/lib/automation/autopilot-v2'
import { googleCalendar } from '@/lib/integrations/google-calendar'
import { localBrain } from '@/lib/database/local-brain'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'
import { useAIEventListeners } from '@/hooks/useAIEventListeners'
import { CostMonitor } from '@/components/CostMonitor'
import { AutoPilotNotifications } from '@/components/AutoPilotNotifications'
import { aiService } from '@/lib/ai/ai-service'
function App() {
  const { setTheme } = useUIStore()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  useAIEventListeners()
  
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
        console.log('🚀 Initializing Life OS...')
        
        // Initialize all systems
        await autoPilot.initialize()
        await googleCalendar.initialize()
        
        // Setup cleanup interval for cache
        setInterval(() => localBrain.cleanupOldCache(), 86400000)
        
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
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      // Cmd/Ctrl + / for AI chat
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setChatOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
      <main className="relative">
        <Outlet />
        
        {/* Desktop AI Chat - sidebar */}
        {chatOpen && (
          <div className="hidden lg:block fixed right-0 top-16 bottom-0 w-96 bg-white dark:bg-gray-900 border-l dark:border-gray-700 shadow-xl z-40">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold">AI Assistant</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
            <ChatInterface className="h-[calc(100%-64px)]" />
          </div>
        )}
      </main>
      
      {/* Mobile AI Chat */}
      <MobileAIChat />
      
      {/* AI Command Palette */}
      <AICommandPalette 
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onChatOpen={() => setChatOpen(true)}
      />
      
      <InstallPWA />
      <AssistantDock />
      <UniversalCommand />
      <ProactiveAssistant />
      <CostMonitor />
      <AutoPilotNotifications />
    </div>
  )
}

export default App
