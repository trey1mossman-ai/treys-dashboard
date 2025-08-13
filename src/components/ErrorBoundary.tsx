import { Component, ReactNode } from 'react'
import { Card } from './Card'
import { Button } from './ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    // In production, you could send this to an error tracking service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>
            <p className="text-muted">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 p-2 bg-muted/20 rounded text-xs overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              <Button onClick={this.handleReset} variant="outline" className="flex-1">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
