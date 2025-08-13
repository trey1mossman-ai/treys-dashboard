import { useState, useEffect } from 'react'
import { UPDATE_INTERVAL_MS } from '@/lib/constants'

export function useNow() {
  const [now, setNow] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, UPDATE_INTERVAL_MS)
    
    return () => clearInterval(interval)
  }, [])
  
  return now
}