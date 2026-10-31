import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import Sidebar from './Sidebar'
import Dashboard from '../pages/Dashboard'
import BooksPage from '../pages/BooksPage'
import MembersPage from '../pages/MembersPage'
import IssueBookPage from '../pages/IssueBookPage'
import ReturnBookPage from '../pages/ReturnBookPage'
import ActiveLoansPage from '../pages/ActiveLoansPage'
import FinesPage from '../pages/FinesPage'
import ReportsPage from '../pages/ReportsPage'
import SettingsPage from '../pages/SettingsPage'

export default function AppShell() {
  const { currentPage } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    window.api.getDashboardStats().then((s: any) => {
      setOverdueCount(s?.overdueCount || 0)
    }).catch(() => {})
  }, [currentPage])

  function renderPage() {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'books': return <BooksPage />
      case 'members': return <MembersPage />
      case 'circulation-issue': return <IssueBookPage />
      case 'circulation-return': return <ReturnBookPage />
      case 'circulation-active': return <ActiveLoansPage />
      case 'fines': return <FinesPage />
      case 'reports': return <ReportsPage />
      case 'settings': return <SettingsPage />
      default: return <Dashboard />
    }
  }

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} overdueCount={overdueCount} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}
