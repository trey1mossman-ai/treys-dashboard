import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Loading } from '@/components/Loading'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MobileDetector } from '@/components/MobileDetector'
import App from '@/App'
// Keep simple app as fallback option
// import App from '@/App-simple'
// import App from '@/App-enhanced'

// Lazy load all route components for better performance
// Dashboard is now merged into Mission Control
const Workflows = lazy(() => import('@/pages/Workflows').then(m => ({ default: m.Workflows })))
const Fitness = lazy(() => import('@/pages/Fitness').then(m => ({ default: m.Fitness })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const Schedule = lazy(() => import('@/pages/Schedule'))
const MissionControl = lazy(() => import('@/pages/MissionControl'))
const MissionControlTest = lazy(() => import('@/pages/MissionControlTest'))
const MissionControlManage = lazy(() => import('@/pages/MissionControlManage'))
const MissionControlSettings = lazy(() => import('@/pages/MissionControlSettings'))
const TestPage = lazy(() => import('@/pages/TestPage'))
const SimpleDashboard = lazy(() => import('@/pages/SimpleDashboard'))
const Day3Demo = lazy(() => import('@/pages/Day3Demo'))
const ProjectBoard = lazy(() => import('@/pages/ProjectBoard'))
const LifeOS = lazy(() => import('@/pages/LifeOS').then(m => ({ default: m.LifeOS })))
const MobileDashboardV3 = lazy(() => import('@/pages/MobileDashboardV3').then(m => ({ default: m.MobileDashboardV3 })))

// Loading wrapper for lazy loaded components with error boundary
function LazyRoute({ Component }: { Component: React.LazyExoticComponent<React.ComponentType> }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="Loading page..." />
        </div>
      }>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
          <a href="/" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            Go Home
          </a>
        </div>
      </div>
    ),
    children: [
      {
        index: true,
        element: <LazyRoute Component={SimpleDashboard} /> // Simple mobile-first dashboard
      },
      {
        path: 'workflows',
        element: <LazyRoute Component={Workflows} />
      },
      {
        path: 'fitness',
        element: <LazyRoute Component={Fitness} />
      },
      {
        path: 'schedule',
        element: <LazyRoute Component={Schedule} />
      },
      {
        path: 'settings',
        element: <LazyRoute Component={Settings} />
      },
      {
        path: 'mission-test',
        element: <LazyRoute Component={MissionControlTest} />
      },
      {
        path: 'mission-control',
        element: <LazyRoute Component={MissionControl} />
      },
      {
        path: 'mission-control/manage',
        element: <LazyRoute Component={MissionControlManage} />
      },
      {
        path: 'mission-control/settings',
        element: <LazyRoute Component={MissionControlSettings} />
      },
      {
        path: 'day3',
        element: <LazyRoute Component={Day3Demo} />
      },
      {
        path: 'projects',
        element: <LazyRoute Component={ProjectBoard} />
      },
      {
        path: 'lifeos',
        element: <LazyRoute Component={LifeOS} />
      },
      {
        path: 'mobile',
        element: <LazyRoute Component={MobileDashboardV3} />
      }
    ]
  }
], {
  // Enable future flags for better performance
  future: {
    v7_relativeSplatPath: true
  }
})

export function Routes() {
  // Log current route for debugging
  console.log('Routes initialized, available paths:', router.routes[0].children?.map(r => r.path));
  return <RouterProvider router={router} />
}
