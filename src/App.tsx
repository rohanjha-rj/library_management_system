import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import AppShell from './components/AppShell'
import ToastContainer from './components/ToastContainer'

function AppInner() {
  const { user } = useApp()
  return (
    <>
      {user ? <AppShell /> : <LoginPage />}
      <ToastContainer />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
