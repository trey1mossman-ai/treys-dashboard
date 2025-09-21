import { useCallback, useRef } from 'react'
import { useGesture } from '@use-gesture/react'

import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export interface SwipeGestureConfig {
  axis?: 'x' | 'y'
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
}

export function useSwipeGesture(config: SwipeGestureConfig = {}) {
  const {
    axis = 'x',
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 80
  } = config

  return useGesture(
    {
      onDragEnd: ({
        movement: [mx, my],
        velocity: [vx, vy],
        direction: [dx, dy],
        swipe: [swipeX, swipeY]
      }) => {
        const fastSwipeLeft = swipeX === -1
        const fastSwipeRight = swipeX === 1
        const fastSwipeUp = swipeY === -1
        const fastSwipeDown = swipeY === 1

        const horizontalDistance = Math.abs(mx)
        const verticalDistance = Math.abs(my)

        if (axis !== 'y' && onSwipeLeft && (fastSwipeLeft || (dx < 0 && (horizontalDistance > threshold || vx > 0.3)))) {
          onSwipeLeft()
          return
        }

        if (axis !== 'y' && onSwipeRight && (fastSwipeRight || (dx > 0 && (horizontalDistance > threshold || vx > 0.3)))) {
          onSwipeRight()
          return
        }

        if (axis !== 'x' && onSwipeUp && (fastSwipeUp || (dy < 0 && (verticalDistance > threshold || vy > 0.3)))) {
          onSwipeUp()
          return
        }

        if (axis !== 'x' && onSwipeDown && (fastSwipeDown || (dy > 0 && (verticalDistance > threshold || vy > 0.3)))) {
          onSwipeDown()
        }
      }
    },
    {
      drag: {
        axis,
        threshold: 10,
        filterTaps: true,
        rubberband: 0.08
      }
    }
  )
}

export interface SwipeNavigationConfig extends SwipeGestureConfig {
  keyboard?: boolean
  onSelect?: () => void
}

export function useSwipeNavigation(config: SwipeNavigationConfig) {
  const { keyboard = true, onSelect, ...gestureConfig } = config

  const bind = useSwipeGesture(gestureConfig)

  if (keyboard) {
    const shortcuts = []

    if (gestureConfig.axis !== 'y') {
      if (gestureConfig.onSwipeLeft) {
        shortcuts.push({ key: 'ArrowLeft', handler: gestureConfig.onSwipeLeft })
      }
      if (gestureConfig.onSwipeRight) {
        shortcuts.push({ key: 'ArrowRight', handler: gestureConfig.onSwipeRight })
      }
    }

    if (gestureConfig.axis !== 'x') {
      if (gestureConfig.onSwipeUp) {
        shortcuts.push({ key: 'ArrowUp', handler: gestureConfig.onSwipeUp })
      }
      if (gestureConfig.onSwipeDown) {
        shortcuts.push({ key: 'ArrowDown', handler: gestureConfig.onSwipeDown })
      }
    }

    if (onSelect) {
      shortcuts.push({ key: 'Enter', handler: onSelect })
      shortcuts.push({ key: ' ', handler: onSelect, preventDefault: true })
    }

    useKeyboardShortcuts(shortcuts, { enabled: keyboard })
  }

  return bind
}

export interface LongPressGestureConfig {
  onLongPress: () => void
  delay?: number
  onPressStart?: () => void
  onPressEnd?: (details: { handled: boolean }) => void
}

export function useLongPressGesture(config: LongPressGestureConfig) {
  const { onLongPress, delay = 450, onPressEnd, onPressStart } = config
  const timerRef = useRef<number | null>(null)
  const handledRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    handledRef.current = false
  }, [])

  const start = useCallback(() => {
    handledRef.current = false
    if (onPressStart) onPressStart()
    timerRef.current = window.setTimeout(() => {
      handledRef.current = true
      onLongPress()
    }, delay)
  }, [delay, onLongPress, onPressStart])

  const end = useCallback(() => {
    if (onPressEnd) onPressEnd({ handled: handledRef.current })
    clear()
  }, [clear, onPressEnd])

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
    onTouchEnd: end,
    onTouchCancel: end
  }
}

export interface GestureAccessibleConfig {
  onActivate: () => void
  axis?: 'x' | 'y'
}

export function useGestureAccessibility(config: GestureAccessibleConfig) {
  const { onActivate, axis = 'x' } = config

  return useSwipeNavigation({
    axis,
    onSwipeLeft: axis === 'x' ? onActivate : undefined,
    onSwipeRight: axis === 'x' ? onActivate : undefined,
    onSwipeUp: axis === 'y' ? onActivate : undefined,
    onSwipeDown: axis === 'y' ? onActivate : undefined,
    onSelect: onActivate
  })
}
