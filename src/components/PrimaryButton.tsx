import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  glowOnFocus?: boolean
}

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ 
    children, 
    className,
    variant = 'primary',
    size = 'md',
    glowOnFocus = true,
    disabled,
    ...props
  }, ref) => {
    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4',
      lg: 'h-12 px-6 text-base'
    }
    
    const variantClasses = {
      primary: cn(
        'bg-primary text-primary-foreground',
        'hover:shadow-[0_8px_40px_rgba(168,132,255,.15)]'
      ),
      accent: cn(
        'bg-accent text-accent-foreground',
        'hover:shadow-[0_8px_40px_rgba(0,214,255,.15)]'
      ),
      ghost: cn(
        'bg-transparent text-foreground',
        'hover:bg-muted/20'
      )
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl font-medium',
          'transition-all duration-150 ease-out',
          'hover:scale-[1.01] active:scale-[0.98]',
          'focus:outline-none',
          glowOnFocus && variant === 'primary' && 'glow-primary',
          glowOnFocus && variant === 'accent' && 'glow-success',
          glowOnFocus && 'focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-0',
          sizeClasses[size],
          variantClasses[variant],
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100',
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

PrimaryButton.displayName = 'PrimaryButton'