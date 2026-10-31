import React, { useState, useEffect } from 'react'
import { Settings, Save, Shield, Users, Database, RefreshCw, X, Plus, Lock } from 'lucide-react'
import { LibrarySetting } from '../types'
import { useApp } from '../context/AppContext'

type SettingsTab = 'library' | 'policy' | 'users' | 'database' | 'audit'

export default function SettingsPage() {
  const { user, showToast } = useApp()
  const [tab, setTab] = useState<SettingsTab>('library')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [userDialog, setUserDialog] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', full_name: '', email: '', password: '', role_id: 2 })
  const [pwdDialog, setPwdDialog] = useState(false)
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [resetConfirm, setResetConfirm] = useState(false)

  const isAdmin = user?.role === 'administrator'

  async function loadSettings() {
    const items = await window.api.getSettings() as LibrarySetting[]
    const map: Record<string, string> = {}
    for (const s of items) map[s.key] = s.value
    setSettings(map)
  }

  async function loadUsers() {
    const u = await window.api.getUsers()
    setUsers(u)
  }

  async function loadAuditLogs() {
    const logs = await window.api.getAuditLogs({})
    setAuditLogs(logs)
  }

  useEffect(() => {
    loadSettings()
    if (tab === 'users') loadUsers()
    if (tab === 'audit') loadAuditLogs()
  }, [tab])

  async function handleSaveSettings() {
    setSaving(true)
    const items = Object.entries(settings).map(([key, value]) => ({ key, value }))
    const res = await window.api.updateSettings(items)
    if (res.success) showToast('Settings saved')
    else showToast('Failed to save settings', 'error')
    setSaving(false)
  }

  async function handleBackup() {
    const res = await window.api.backupDatabase()
    if (res.success) showToast(`Database backed up to ${res.path}`)
    else showToast(res.error || 'Backup failed', 'error')
  }

  async function handleReset() {
    setResetConfirm(false)
    const res = await window.api.resetSampleData()
    if (res.success) showToast('Sample data reset successfully')
    else showToast(res.error || 'Reset failed', 'error')
  }

  async function handleCreateUser() {
    const res = await window.api.createUser(newUser)
    if (res.success) {
      showToast('User created')
      setUserDialog(false)
      setNewUser({ username: '', full_name: '', email: '', password: '', role_id: 2 })
      loadUsers()
    } else {
      showToast(res.error || 'Failed to create user', 'error')
    }
  }

  async function handleChangePassword() {
    if (pwdForm.newPassword !== pwdForm.confirm) {
      showToast('Passwords do not match', 'error')
      return
    }
    if (pwdForm.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }
    const res = await window.api.changePassword({
      userId: user!.id,
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })
    if (res.success) {
      showToast('Password changed successfully')
      setPwdDialog(false)
      setPwdForm({ oldPassword: '', newPassword: '', confirm: '' })
    } else {
      showToast(res.error || 'Failed to change password', 'error')
    }
  }

  async function handleToggleUser(u: any) {
    await window.api.updateUser({ ...u, is_active: u.is_active ? 0 : 1 })
    loadUsers()
    showToast(`User ${u.is_active ? 'deactivated' : 'activated'}`)
  }

  const tabBtnStyle = (t: SettingsTab) => ({
    background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px',
    fontSize: 13, fontWeight: tab === t ? 600 : 400,
    color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
  } as React.CSSProperties)

  const sKey = (k: string) => (v: string) => setSettings(s => ({ ...s, [k]: v }))

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <Settings size={18} color="var(--color-text-muted)" />
          <h1 className="page-title">Settings & Administration</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setPwdDialog(true)}>
            <Lock size={13} /> Change Password
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 24px', background: 'var(--color-surface)', flexShrink: 0 }}>
        {(['library', 'policy', 'users', 'database', 'audit'] as SettingsTab[]).map(t => (
          <button key={t} style={tabBtnStyle(t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'users' && !isAdmin && ' (Admin only)'}
          </button>
        ))}
      </div>

      <div className="page-body">
        {/* Library Info */}
        {tab === 'library' && (
          <div style={{ maxWidth: 600 }}>
            <div className="section">
              <div className="section-header">
                <span className="section-title">Library Information</span>
              </div>
              <div style={{ padding: 20 }} className="stack">
                {[
                  { key: 'library_name', label: 'Library Name', placeholder: 'e.g. Vidyasagar College Library' },
                  { key: 'library_address', label: 'Address', placeholder: 'Library address' },
                  { key: 'library_phone', label: 'Phone Number', placeholder: '+91 XXXXX XXXXX' },
                  { key: 'library_email', label: 'Email', placeholder: 'library@college.edu' },
                  { key: 'academic_year', label: 'Academic Year', placeholder: '2025-2026' },
                  { key: 'currency_symbol', label: 'Currency Symbol', placeholder: '₹' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input className="form-input" value={settings[key] || ''} onChange={e => sKey(key)(e.target.value)} placeholder={placeholder} />
                  </div>
                ))}
                <div style={{ paddingTop: 8 }}>
                  <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <span className="loading-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Save size={14} />}
                    Save Library Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Policy */}
        {tab === 'policy' && (
          <div style={{ maxWidth: 600 }}>
            <div className="section">
              <div className="section-header">
                <span className="section-title">Circulation & Fine Policy</span>
              </div>
              <div style={{ padding: 20 }} className="stack">
                {[
                  { key: 'max_loan_days', label: 'Default Loan Duration (days)', placeholder: '14', type: 'number' },
                  { key: 'max_books_per_member', label: 'Default Max Books per Member', placeholder: '3', type: 'number' },
                  { key: 'fine_per_day', label: 'Fine per Overdue Day (₹)', placeholder: '2.00', type: 'number' },
                  { key: 'renewal_limit', label: 'Maximum Renewals Allowed', placeholder: '2', type: 'number' },
                  { key: 'renewal_days', label: 'Days Added per Renewal', placeholder: '7', type: 'number' },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input className="form-input" type={type || 'text'} value={settings[key] || ''} onChange={e => sKey(key)(e.target.value)} placeholder={placeholder} style={{ maxWidth: 200 }} />
                  </div>
                ))}
                <div style={{ paddingTop: 8 }}>
                  <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
                    <Save size={14} /> Save Policy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div style={{ maxWidth: 800 }}>
            {!isAdmin ? (
              <div className="alert alert-warning">
                <Shield size={16} /> You need administrator access to manage users.
              </div>
            ) : (
              <div className="section">
                <div className="section-header">
                  <span className="section-title">User Management</span>
                  <button className="btn btn-primary btn-sm" onClick={() => setUserDialog(true)}>
                    <Plus size={13} /> Add User
                  </button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Last Login</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id}>
                        <td className="cell-mono">{u.username}</td>
                        <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.email || '—'}</td>
                        <td><span className="chip">{u.role_name}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.last_login ? u.last_login.split('T')[0] : '—'}</td>
                        <td>
                          {u.is_active
                            ? <span className="badge badge-success">Active</span>
                            : <span className="badge badge-neutral">Inactive</span>}
                        </td>
                        <td>
                          {u.id !== user?.id && (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => handleToggleUser(u)}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Database */}
        {tab === 'database' && (
          <div style={{ maxWidth: 600 }} className="stack">
            <div className="section">
              <div className="section-header"><span className="section-title">Database Backup</span></div>
              <div style={{ padding: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                  Create a backup copy of the database in the application data directory. Backups preserve all books, members, transactions, and settings.
                </p>
                <button className="btn btn-secondary" onClick={handleBackup}>
                  <Database size={14} /> Create Backup
                </button>
              </div>
            </div>
            {isAdmin && (
              <div className="section">
                <div className="section-header">
                  <span className="section-title" style={{ color: 'var(--color-danger)' }}>Reset Sample Data</span>
                </div>
                <div style={{ padding: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                    Reset all books, members, and transactions to the original demonstration data. <strong>This will delete all current data.</strong> User accounts and settings are preserved.
                  </p>
                  <button className="btn btn-danger" onClick={() => setResetConfirm(true)}>
                    <RefreshCw size={14} /> Reset to Sample Data
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit */}
        {tab === 'audit' && (
          <div>
            <div className="section">
              <div className="section-header"><span className="section-title">Audit Log</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                          {log.created_at?.replace('T', ' ').substring(0, 19)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{log.full_name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{log.username}</div>
                        </td>
                        <td><span className="chip">{log.action}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 260 }}>
                          {log.details ? (
                            <span className="ellipsis" style={{ display: 'block' }}>{log.details}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="table-empty">No audit logs</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      {userDialog && (
        <div className="dialog-overlay">
          <div className="dialog dialog-sm">
            <div className="dialog-header">
              <span className="dialog-title">Create User</span>
              <button className="dialog-close" onClick={() => setUserDialog(false)}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              {[
                { key: 'username', label: 'Username', placeholder: 'e.g. jsmith', type: 'text' },
                { key: 'full_name', label: 'Full Name', placeholder: 'Full name', type: 'text' },
                { key: 'email', label: 'Email', placeholder: 'email@example.com', type: 'email' },
                { key: 'password', label: 'Password', placeholder: 'Min. 6 characters', type: 'password' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="form-group">
                  <label className="form-label required">{label}</label>
                  <input className="form-input" type={type} value={(newUser as any)[key]} onChange={e => setNewUser(u => ({ ...u, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={newUser.role_id} onChange={e => setNewUser(u => ({ ...u, role_id: parseInt(e.target.value) }))}>
                  <option value={1}>Administrator</option>
                  <option value={2}>Librarian</option>
                  <option value={3}>Assistant Librarian</option>
                </select>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setUserDialog(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateUser}>Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Dialog */}
      {pwdDialog && (
        <div className="dialog-overlay">
          <div className="dialog dialog-sm">
            <div className="dialog-header">
              <span className="dialog-title">Change Password</span>
              <button className="dialog-close" onClick={() => setPwdDialog(false)}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              {[
                { key: 'oldPassword', label: 'Current Password' },
                { key: 'newPassword', label: 'New Password' },
                { key: 'confirm', label: 'Confirm New Password' },
              ].map(({ key, label }) => (
                <div key={key} className="form-group">
                  <label className="form-label required">{label}</label>
                  <input className="form-input" type="password" value={(pwdForm as any)[key]} onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setPwdDialog(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleChangePassword}>Change Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm Dialog */}
      {resetConfirm && (
        <div className="dialog-overlay">
          <div className="dialog dialog-sm">
            <div className="dialog-header">
              <span className="dialog-title">Confirm Reset</span>
              <button className="dialog-close" onClick={() => setResetConfirm(false)}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              <div className="alert alert-error">
                This will <strong>permanently delete all current data</strong> including books, members, and transactions, and restore the original sample data. This cannot be undone.
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setResetConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReset}><RefreshCw size={14} /> Reset Data</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
