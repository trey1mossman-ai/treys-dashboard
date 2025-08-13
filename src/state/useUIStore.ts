import { create } from 'zustand'

interface UIState {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  
  setTheme: (theme: 'dark' | 'light') => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarOpen: false,
  
  setTheme: (theme) => {
    set({ theme })
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  },
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}))