import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Loading } from '@/components/Loading'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import App from '@/App'

// Lazy load all route components for better performance
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Workflows = lazy(() => import('@/pages/Workflows').then(m => ({ default: m.Workflows })))
const Fitness = lazy(() => import('@/pages/Fitness').then(m => ({ default: m.Fitness })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))

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
        element: <LazyRoute Component={Dashboard} />
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
        path: 'settings',
        element: <LazyRoute Component={Settings} />
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
  return <RouterProvider router={router} />
}
