import React, { useState } from 'react'
import {
  LayoutDashboard, BookOpen, Users, ArrowRightLeft, ArrowDownCircle, ArrowUpCircle,
  List, DollarSign, BarChart2, Settings, ChevronLeft, ChevronRight, LogOut,
  ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { NavigationPage } from '../types'

interface NavItem {
  id: NavigationPage
  label: string
  icon: React.ElementType
  children?: NavItem[]
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'members', label: 'Members', icon: Users },
  {
    id: 'circulation-active' as any,
    label: 'Circulation',
    icon: ArrowRightLeft,
    children: [
      { id: 'circulation-issue', label: 'Issue Books', icon: ArrowRightLeft },
      { id: 'circulation-return', label: 'Return Books', icon: ArrowDownCircle },
      { id: 'circulation-active', label: 'Active Loans', icon: List },
    ]
  },
  { id: 'fines', label: 'Fines', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  overdueCount?: number
}

export default function Sidebar({ collapsed, setCollapsed, overdueCount = 0 }: SidebarProps) {
  const { user, setUser, currentPage, setCurrentPage, showToast } = useApp()
  const [circulationOpen, setCirculationOpen] = useState(
    ['circulation-issue', 'circulation-return', 'circulation-active'].includes(currentPage)
  )

  async function handleLogout() {
    await window.api.logout()
    setUser(null)
    showToast('Signed out successfully', 'info')
  }

  const initials = user?.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  const roleDisplay = user?.role.replace('_', ' ') || ''

  function renderItem(item: NavItem) {
    if (item.children) {
      const isChildActive = item.children.some(c => c.id === currentPage)
      return (
        <div key={item.id}>
          <button
            className={`sidebar-item ${isChildActive ? 'active' : ''}`}
            onClick={() => !collapsed && setCirculationOpen(v => !v)}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={15} className="sidebar-item-icon" />
            <span className="sidebar-item-label">{item.label}</span>
            {!collapsed && (
              circulationOpen
                ? <ChevronDown size={13} style={{ color: 'var(--color-sidebar-icon)' }} />
                : <ChevronRightIcon size={13} style={{ color: 'var(--color-sidebar-icon)' }} />
            )}
          </button>
          {(circulationOpen || collapsed) && !collapsed && (
            <div style={{ paddingLeft: 8 }}>
              {item.children.map(child => (
                <button
                  key={child.id}
                  className={`sidebar-item ${currentPage === child.id ? 'active' : ''}`}
                  onClick={() => setCurrentPage(child.id)}
                  style={{ paddingLeft: 24 }}
                >
                  <child.icon size={13} className="sidebar-item-icon" />
                  <span className="sidebar-item-label">{child.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }
    return (
      <button
        key={item.id}
        className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
        onClick={() => setCurrentPage(item.id)}
        title={collapsed ? item.label : undefined}
      >
        <item.icon size={15} className="sidebar-item-icon" />
        <span className="sidebar-item-label">{item.label}</span>
        {item.id === 'circulation-active' && overdueCount > 0 && (
          <span className="sidebar-item-badge">{overdueCount}</span>
        )}
      </button>
    )
  }

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <BookOpen size={16} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">LibraryMS</span>
          <span className="sidebar-logo-subtitle">v1.0 — College Edition</span>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {NAV_ITEMS.map(renderItem)}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user" title={collapsed ? `${user?.fullName} (${roleDisplay})` : undefined}>
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.fullName}</div>
            <div className="sidebar-user-role">{roleDisplay}</div>
          </div>
          <button className="sidebar-collapse-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={13} />
          </button>
        </div>
        <button
          className="sidebar-item"
          style={{ marginTop: 2 }}
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRightIcon size={14} className="sidebar-item-icon" />
            : <ChevronLeft size={14} className="sidebar-item-icon" />
          }
          <span className="sidebar-item-label">Collapse</span>
        </button>
      </div>
    </nav>
  )
}
