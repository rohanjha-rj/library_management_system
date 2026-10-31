import React from 'react'
import { useApp } from '../context/AppContext'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={15} color="var(--color-sidebar-active-indicator)" />,
  error: <AlertCircle size={15} color="#d44" />,
  warning: <AlertTriangle size={15} color="#c8a000" />,
  info: <Info size={15} color="var(--color-accent)" />,
}

export default function ToastContainer() {
  const { toasts } = useApp()
  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {ICONS[t.type]}
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
