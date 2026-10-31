import React, { useState } from 'react'
import { BookOpen, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function LoginPage() {
  const { setUser, showToast } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await window.api.login({ username: username.trim(), password })
      if (result.success) {
        setUser(result.user)
        showToast(`Welcome back, ${result.user.fullName}`)
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err: any) {
      setError('Unable to connect to the database. Please restart the application.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Library Management System
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Vidyasagar College Library
            </div>
          </div>
        </div>

        <div className="login-title">Sign in</div>
        <div className="login-subtitle">Enter your credentials to access the system</div>

        <form onSubmit={handleLogin} className="stack">
          <div className="form-group">
            <label className="form-label required">Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <User size={14} />
              </span>
              <input
                className="form-input"
                style={{ paddingLeft: 32 }}
                placeholder="e.g. admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <Lock size={14} />
              </span>
              <input
                type={showPwd ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: 32, paddingRight: 36 }}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !username || !password}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer-hint">
          <div style={{ marginBottom: 4 }}>Demo credentials:</div>
          <div><strong>admin</strong> / admin123 &nbsp;·&nbsp; <strong>librarian</strong> / lib123 &nbsp;·&nbsp; <strong>assistant</strong> / assist123</div>
        </div>
      </div>
    </div>
  )
}
