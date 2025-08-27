import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className 
}: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  const sizeClasses = {
    sm: 'max-w-[95vw] md:max-w-md',
    md: 'max-w-[95vw] md:max-w-lg',
    lg: 'max-w-[95vw] md:max-w-2xl',
    xl: 'max-w-[95vw] md:max-w-4xl'
  }
  
  return (
    <div className="fixed inset-0 z-50 animate-slide-up">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8">
        <div className={cn(
          'relative w-full',
          sizeClasses[size],
          className
        )}>
          <div className="card-base glow-soft p-0 overflow-hidden max-h-[90vh] flex flex-col">
            {title && (
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                <h2 className="text-xl md:text-xl font-semibold pr-4">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted/50 interactive shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}