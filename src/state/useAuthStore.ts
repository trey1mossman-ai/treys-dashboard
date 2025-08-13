import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  login: async (email, _password) => {
    set({ isLoading: true })
    
    try {
      const mockUser: User = {
        id: '1',
        email,
        name: 'User',
      }
      
      set({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false
      })
      
      localStorage.setItem('auth_token', 'mock_token')
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },
  
  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    })
    localStorage.removeItem('auth_token')
  },
  
  checkAuth: async () => {
    set({ isLoading: true })
    
    try {
      const token = localStorage.getItem('auth_token')
      
      if (token) {
        const mockUser: User = {
          id: '1',
          email: 'user@example.com',
          name: 'User',
        }
        
        set({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      set({ isLoading: false })
    }
  }
}))