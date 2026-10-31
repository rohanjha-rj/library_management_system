import React, { createContext, useContext, useState, useCallback } from 'react'
import { User } from '../types'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface AppContextType {
  user: User | null
  setUser: (u: User | null) => void
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
  currentPage: string
  setCurrentPage: (p: string) => void
}

const AppContext = createContext<AppContextType>(null!)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [currentPage, setCurrentPage] = useState('dashboard')

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <AppContext.Provider value={{ user, setUser, toasts, showToast, currentPage, setCurrentPage }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
