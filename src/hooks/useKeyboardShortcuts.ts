import { useEffect, useCallback, useRef } from 'react'

interface ShortcutHandler {
  key: string
  ctrl?: boolean
  cmd?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  description?: string
  preventDefault?: boolean
}

interface ShortcutOptions {
  enabled?: boolean
  priority?: number
  scope?: string
}

const shortcuts = new Map<string, ShortcutHandler[]>()
const globalShortcuts: ShortcutHandler[] = []

export function useKeyboardShortcuts(
  handlers: ShortcutHandler[],
  options: ShortcutOptions = {}
) {
  const { enabled = true, scope = 'global' } = options
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInputField = activeElement?.tagName === 'INPUT' ||
                          activeElement?.tagName === 'TEXTAREA' ||
                          activeElement?.getAttribute('contenteditable') === 'true'

      for (const shortcut of handlersRef.current) {
        const matchesKey = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const matchesCtrl = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey
        const matchesCmd = shortcut.cmd ? e.metaKey : !e.metaKey
        const matchesShift = shortcut.shift ? e.shiftKey : !e.shiftKey
        const matchesAlt = shortcut.alt ? e.altKey : !e.altKey

        if (matchesKey && matchesCtrl && matchesCmd && matchesShift && matchesAlt) {
          // Skip if in input field unless explicitly allowed
          if (isInputField && !shortcut.key.includes('Escape')) continue

          if (shortcut.preventDefault !== false) {
            e.preventDefault()
            e.stopPropagation()
          }

          shortcut.handler()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [enabled])
}

// Global shortcuts registry for the app
export function registerGlobalShortcut(shortcut: ShortcutHandler) {
  globalShortcuts.push(shortcut)
}

export function unregisterGlobalShortcut(key: string) {
  const index = globalShortcuts.findIndex(s => s.key === key)
  if (index >= 0) globalShortcuts.splice(index, 1)
}

// Keyboard navigation hook for lists
export function useKeyboardNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  options: { wrap?: boolean; orientation?: 'vertical' | 'horizontal' } = {}
) {
  const { wrap = true, orientation = 'vertical' } = options
  const selectedIndexRef = useRef(0)

  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (items.length === 0) return

    let newIndex = selectedIndexRef.current

    if (orientation === 'vertical') {
      if (direction === 'up' || direction === 'left') {
        newIndex = newIndex > 0 ? newIndex - 1 : (wrap ? items.length - 1 : 0)
      } else if (direction === 'down' || direction === 'right') {
        newIndex = newIndex < items.length - 1 ? newIndex + 1 : (wrap ? 0 : items.length - 1)
      }
    } else {
      if (direction === 'left' || direction === 'up') {
        newIndex = newIndex > 0 ? newIndex - 1 : (wrap ? items.length - 1 : 0)
      } else if (direction === 'right' || direction === 'down') {
        newIndex = newIndex < items.length - 1 ? newIndex + 1 : (wrap ? 0 : items.length - 1)
      }
    }

    selectedIndexRef.current = newIndex
    onSelect(items[newIndex], newIndex)
  }, [items, onSelect, wrap, orientation])

  const selectCurrent = useCallback(() => {
    if (items.length > 0 && selectedIndexRef.current < items.length) {
      onSelect(items[selectedIndexRef.current], selectedIndexRef.current)
    }
  }, [items, onSelect])

  const reset = useCallback(() => {
    selectedIndexRef.current = 0
    if (items.length > 0) {
      onSelect(items[0], 0)
    }
  }, [items, onSelect])

  return {
    navigate,
    selectCurrent,
    reset,
    selectedIndex: selectedIndexRef.current
  }
}

// Predefined app shortcuts
export const APP_SHORTCUTS = {
  COMMAND_PALETTE: { key: 'k', cmd: true, description: 'Open command palette' },
  SEARCH: { key: '/', description: 'Focus search' },
  NEW_TASK: { key: 'n', cmd: true, description: 'Create new task' },
  NEW_NOTE: { key: 'n', cmd: true, shift: true, description: 'Create new note' },
  TOGGLE_SIDEBAR: { key: 'b', cmd: true, description: 'Toggle sidebar' },
  QUICK_ACTION: { key: 'Enter', cmd: true, description: 'Quick action' },
  ESCAPE: { key: 'Escape', description: 'Close modal/cancel' },
  SAVE: { key: 's', cmd: true, description: 'Save changes' },
  DELETE: { key: 'd', cmd: true, description: 'Delete selected' },
  UNDO: { key: 'z', cmd: true, description: 'Undo' },
  REDO: { key: 'z', cmd: true, shift: true, description: 'Redo' },
  SELECT_ALL: { key: 'a', cmd: true, description: 'Select all' },
  NAVIGATE_UP: { key: 'ArrowUp', description: 'Navigate up' },
  NAVIGATE_DOWN: { key: 'ArrowDown', description: 'Navigate down' },
  NAVIGATE_LEFT: { key: 'ArrowLeft', description: 'Navigate left' },
  NAVIGATE_RIGHT: { key: 'ArrowRight', description: 'Navigate right' },
  TAB_NEXT: { key: 'Tab', description: 'Next field' },
  TAB_PREV: { key: 'Tab', shift: true, description: 'Previous field' },
  PAGE_UP: { key: 'PageUp', description: 'Page up' },
  PAGE_DOWN: { key: 'PageDown', description: 'Page down' },
  HOME: { key: 'Home', description: 'Go to start' },
  END: { key: 'End', description: 'Go to end' }
}