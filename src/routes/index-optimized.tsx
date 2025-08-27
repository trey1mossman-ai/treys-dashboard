import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

// Optimized loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
)

// Error boundary component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center max-w-md">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Reload page
      </button>
    </div>
  </div>
)

// Lazy load all routes with prefetch hints
const SimpleDashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard", webpackPrefetch: true */ '@/pages/SimpleDashboard')
)

const Schedule = lazy(() => 
  import(/* webpackChunkName: "schedule", webpackPrefetch: true */ '@/pages/Schedule')
)

const Workflows = lazy(() => 
  import(/* webpackChunkName: "workflows" */ '@/pages/Workflows')
)

const Fitness = lazy(() => 
  import(/* webpackChunkName: "fitness" */ '@/pages/Fitness')
)

const Settings = lazy(() => 
  import(/* webpackChunkName: "settings" */ '@/pages/Settings')
)

const MissionControl = lazy(() => 
  import(/* webpackChunkName: "mission-control" */ '@/pages/MissionControl')
)

const MissionControlTest = lazy(() => 
  import(/* webpackChunkName: "mission-control-test" */ '@/pages/MissionControlTest')
)

const MissionControlSettings = lazy(() => 
  import(/* webpackChunkName: "mission-control-settings" */ '@/pages/MissionControlSettings')
)

const MissionControlManage = lazy(() => 
  import(/* webpackChunkName: "mission-control-manage" */ '@/pages/MissionControlManage')
)

// Prefetch critical routes on idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Prefetch dashboard and schedule as they're most likely to be used
    import('@/pages/SimpleDashboard')
    import('@/pages/Schedule')
  })
}

// Route configuration with code splitting
export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Main routes */}
        <Route path="/" element={<SimpleDashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/fitness" element={<Fitness />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Mission Control routes */}
        <Route path="/mission-control" element={<MissionControl />} />
        <Route path="/mission-control/test" element={<MissionControlTest />} />
        <Route path="/mission-control/settings" element={<MissionControlSettings />} />
        <Route path="/mission-control/manage" element={<MissionControlManage />} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

// Preload function for manual route prefetching
export function preloadRoute(routeName: string) {
  switch (routeName) {
    case 'dashboard':
      return import('@/pages/SimpleDashboard')
    case 'schedule':
      return import('@/pages/Schedule')
    case 'workflows':
      return import('@/pages/Workflows')
    case 'fitness':
      return import('@/pages/Fitness')
    case 'settings':
      return import('@/pages/Settings')
    case 'mission-control':
      return import('@/pages/MissionControl')
    default:
      return Promise.resolve()
  }
}

// Hook for route prefetching on hover
export function useRoutePrefetch() {
  const prefetchRoute = (routeName: string) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        preloadRoute(routeName)
      })
    } else {
      setTimeout(() => {
        preloadRoute(routeName)
      }, 100)
    }
  }
  
  return { prefetchRoute }
}