import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      // Store current scroll position
      const scrollY = window.scrollY
      // Apply fixed positioning with offset
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY.replace('-', '').replace('px', '')))
      }
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8 pointer-events-none">
        <div className="relative w-full max-w-[95vw] md:max-w-lg pointer-events-auto animate-in zoom-in-95 duration-200">
          {children}
        </div>
      </div>
    </div>
  )
}

export function DialogContent({ 
  children, 
  className,
  onClose,
  ...props 
}: { 
  children: React.ReactNode
  className?: string
  onClose?: () => void
} & React.HTMLAttributes<HTMLDivElement>) {
  // Prevent clicks inside dialog from closing it
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div 
      className={cn(
        "relative bg-card border border-border rounded-lg shadow-xl p-4 md:p-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      onClick={handleContentClick}
      {...props}
    >
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="absolute right-3 top-3 md:right-4 md:top-4 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-muted"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5 md:h-4 md:w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>
  )
}

export function DialogHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-left", className)}>
      {children}
    </div>
  )
}

export function DialogTitle({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={cn("text-xl md:text-lg font-semibold pr-8", className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-base md:text-sm text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function DialogFooter({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:justify-end md:space-x-2 md:gap-0 mt-6", className)}>
      {children}
    </div>
  )
}