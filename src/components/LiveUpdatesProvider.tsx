// Live Updates Provider - Manages SSE connection for the entire app
import React from 'react';
import { useSSE } from '../hooks/useSSE';

interface LiveUpdatesProviderProps {
  children: React.ReactNode;
}

export function LiveUpdatesProvider({ children }: LiveUpdatesProviderProps) {
  // This hook manages the SSE connection and updates stores
  useSSE();
  
  return <>{children}</>;
}
