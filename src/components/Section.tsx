import { cn } from '@/lib/utils'
import React from 'react'

interface SectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title && (
        <h2 className="text-xl font-semibold text-foreground">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}