import { useState, useEffect, useCallback, useRef } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const timeoutRef = useRef<NodeJS.Timeout>()

  // Debounced save to localStorage
  const saveToStorage = useCallback((value: T) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Error saving localStorage key "${key}":`, error)
      }
    }, 500) // 500ms debounce
  }, [key])

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prevValue => {
      const valueToStore = value instanceof Function ? value(prevValue) : value
      saveToStorage(valueToStore)
      return valueToStore
    })
  }, [saveToStorage])

  // Handle storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      // Clear timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [key])

  return [storedValue, setValue]
}
