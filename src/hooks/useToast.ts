import { useLifeOSEmitter } from '@/services/eventBus'

interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  variant?: 'default' | 'success' | 'error' | 'warning'
}

export function useToast() {
  const emitter = useLifeOSEmitter()

  const toast = {
    success: (message: string, options?: ToastOptions) => {
      emitter.emit('toast.show', {
        message,
        variant: 'success',
        ...options
      })
      console.log(`✅ ${message}`)
    },
    error: (message: string, options?: ToastOptions) => {
      emitter.emit('toast.show', {
        message,
        variant: 'error',
        ...options
      })
      console.error(`❌ ${message}`)
    },
    info: (message: string, options?: ToastOptions) => {
      emitter.emit('toast.show', {
        message,
        variant: 'default',
        ...options
      })
      console.info(`ℹ️ ${message}`)
    },
    warning: (message: string, options?: ToastOptions) => {
      emitter.emit('toast.show', {
        message,
        variant: 'warning',
        ...options
      })
      console.warn(`⚠️ ${message}`)
    }
  }

  return { toast }
}