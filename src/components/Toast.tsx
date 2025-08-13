import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  id: string
  message: string
  type: ToastType
  onClose: (id: string) => void
}

export function Toast({ id, message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000)
    return () => clearTimeout(timer)
  }, [id, onClose])
  
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  }
  
  const colors = {
    success: 'border-green-500/50 text-green-400',
    error: 'border-red-500/50 text-red-400',
    info: 'border-accent/50 text-accent'
  }
  
  const Icon = icons[type]
  
  return (
    <div className={cn(
      'card-base p-4 pr-12 min-w-[300px]',
      'border-l-4',
      'animate-slide-up',
      colors[type]
    )}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">{message}</p>
      </div>
      
      <button
        onClick={() => onClose(id)}
        className="absolute top-4 right-4 p-1 rounded hover:bg-muted/50 interactive"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null
  
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={onClose}
        />
      ))}
    </div>
  )
}

// Toast hook
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])
  
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }
  
  return { toasts, showToast, removeToast }
}