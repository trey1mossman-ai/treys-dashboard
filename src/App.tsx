import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { InstallPWA } from '@/components/InstallPWA'
import { useUIStore } from '@/state/useUIStore'
import { exportToPDF } from '@/lib/export'
import { WifiOff, Wifi, AlertCircle } from 'lucide-react'

type ApiStatus = 'checking' | 'online' | 'offline' | 'error';

function App() {
  const { setTheme } = useUIStore()
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [showStatusBar, setShowStatusBar] = useState(false)
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      setTheme('dark')
    }
  }, [setTheme])
  
  // Check API health
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch('/api/health')
        if (response.ok) {
          const data = await response.json()
          setApiStatus(data.ok ? 'online' : 'error')
        } else {
          setApiStatus('offline')
        }
      } catch (error) {
        console.log('API not available, using offline mode')
        setApiStatus('offline')
      }
      
      // Show status bar briefly if offline
      if (apiStatus === 'offline' || apiStatus === 'error') {
        setShowStatusBar(true)
        setTimeout(() => setShowStatusBar(false), 5000)
      }
    }
    
    // Check immediately
    checkApiHealth()
    
    // Check periodically
    const interval = setInterval(checkApiHealth, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
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
      {/* API Status Bar */}
      {(apiStatus === 'offline' || apiStatus === 'error' || showStatusBar) && (
        <div className={`
          transition-all duration-300 ease-in-out
          ${apiStatus === 'offline' ? 'bg-yellow-500/10 border-yellow-500/50' : ''}
          ${apiStatus === 'error' ? 'bg-red-500/10 border-red-500/50' : ''}
          ${apiStatus === 'online' && showStatusBar ? 'bg-green-500/10 border-green-500/50' : ''}
          border-b px-4 py-2
        `}>
          <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
            {apiStatus === 'offline' && (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Running in offline mode - data stored locally</span>
              </>
            )}
            {apiStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>API error - some features may be limited</span>
              </>
            )}
            {apiStatus === 'online' && showStatusBar && (
              <>
                <Wifi className="w-4 h-4" />
                <span>Connected to API</span>
              </>
            )}
          </div>
        </div>
      )}
      
      <Header onJumpToNow={handleJumpToNow} onExport={handleExport} />
      <main>
        <Outlet />
      </main>
      <InstallPWA />
    </div>
  )
}

export default App
