import { useState, useEffect, useRef, useCallback } from 'react'

interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  storageKey?: string
  defaultPosition?: Position
  bounds?: 'parent' | 'window' | 'none'
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const {
    storageKey,
    defaultPosition = { x: 100, y: 100 },
    bounds = 'window'
  } = options

  const [position, setPosition] = useState<Position>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // Invalid JSON, use default
        }
      }
    }
    return defaultPosition
  })

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const elementRef = useRef<HTMLDivElement>(null)

  // Save position to localStorage when it changes
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(position))
    }
  }, [position, storageKey])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const element = elementRef.current
    if (!element) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })

    e.preventDefault()
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const element = elementRef.current
    if (!element) return

    let newX = e.clientX - dragStart.x
    let newY = e.clientY - dragStart.y

    // Apply bounds
    if (bounds === 'window') {
      const rect = element.getBoundingClientRect()
      newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX))
      newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY))
    } else if (bounds === 'parent') {
      const parent = element.parentElement
      if (parent) {
        const parentRect = parent.getBoundingClientRect()
        const rect = element.getBoundingClientRect()
        newX = Math.max(0, Math.min(parentRect.width - rect.width, newX))
        newY = Math.max(0, Math.min(parentRect.height - rect.height, newY))
      }
    }

    setPosition({ x: newX, y: newY })
  }, [isDragging, dragStart, bounds])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const element = elementRef.current
    if (!element) return

    setIsDragging(true)
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    })

    e.preventDefault()
  }, [position])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const element = elementRef.current
    if (!element) return

    let newX = touch.clientX - dragStart.x
    let newY = touch.clientY - dragStart.y

    // Apply bounds
    if (bounds === 'window') {
      const rect = element.getBoundingClientRect()
      newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX))
      newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY))
    }

    setPosition({ x: newX, y: newY })
  }, [isDragging, dragStart, bounds])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Set up global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  return {
    position,
    isDragging,
    elementRef,
    handleMouseDown,
    handleTouchStart,
    setPosition
  }
}