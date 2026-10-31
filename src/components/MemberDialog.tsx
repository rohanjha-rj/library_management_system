import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Member, MembershipType } from '../types'
import { useApp } from '../context/AppContext'

interface Props {
  member: Member | null
  membershipTypes: MembershipType[]
  onClose: () => void
  onSaved: () => void
}

export default function MemberDialog({ member, membershipTypes, onClose, onSaved }: Props) {
  const { showToast } = useApp()
  const [form, setForm] = useState({
    member_id: '', full_name: '', registration_number: '', department: '',
    course: '', email: '', phone: '', membership_type_id: '',
    membership_start: '', membership_expiry: '', status: 'active', notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (member) {
      setForm({
        member_id: member.member_id || '',
        full_name: member.full_name || '',
        registration_number: member.registration_number || '',
        department: member.department || '',
        course: member.course || '',
        email: member.email || '',
        phone: member.phone || '',
        membership_type_id: member.membership_type_id?.toString() || '',
        membership_start: member.membership_start || '',
        membership_expiry: member.membership_expiry || '',
        status: member.status || 'active',
        notes: member.notes || ''
      })
    } else {
      // Auto-generate member ID
      const year = new Date().getFullYear()
      const rand = Math.floor(Math.random() * 900 + 100)
      setForm(f => ({ ...f, member_id: `MEM-${year}-${rand}` }))
    }
  }, [member])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.member_id.trim()) e.member_id = 'Member ID is required'
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const data = {
        ...form,
        id: member?.id,
        membership_type_id: form.membership_type_id ? parseInt(form.membership_type_id) : null,
      }
      const res = member ? await window.api.updateMember(data) : await window.api.createMember(data)
      if (res.success) {
        showToast(member ? 'Member updated' : 'Member registered successfully')
        onSaved()
      } else {
        showToast(res.error || 'Failed to save', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-lg">
        <div className="dialog-header">
          <span className="dialog-title">{member ? 'Edit Member' : 'Register New Member'}</span>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Member ID</label>
              <input className="form-input" value={form.member_id} onChange={f('member_id')} placeholder="MEM-2024-001" />
              {errors.member_id && <span className="form-error">{errors.member_id}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Full Name</label>
              <input className="form-input" value={form.full_name} onChange={f('full_name')} placeholder="Full name" />
              {errors.full_name && <span className="form-error">{errors.full_name}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Registration / Employee Number</label>
              <input className="form-input" value={form.registration_number} onChange={f('registration_number')} placeholder="REG2021CS001" />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" value={form.department} onChange={f('department')} placeholder="e.g. Computer Science" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Course / Designation</label>
              <input className="form-input" value={form.course} onChange={f('course')} placeholder="e.g. B.Tech, Professor" />
            </div>
            <div className="form-group">
              <label className="form-label">Membership Type</label>
              <select className="form-select" value={form.membership_type_id} onChange={f('membership_type_id')}>
                <option value="">— Select —</option>
                {membershipTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.max_books} books, {t.loan_days}d)</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={f('email')} placeholder="email@example.com" />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={f('phone')} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Membership Start</label>
              <input className="form-input" type="date" value={form.membership_start} onChange={f('membership_start')} />
            </div>
            <div className="form-group">
              <label className="form-label">Membership Expiry</label>
              <input className="form-input" type="date" value={form.membership_expiry} onChange={f('membership_expiry')} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={f('status')}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={f('notes')} rows={2} />
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : null}
            {member ? 'Save Changes' : 'Register Member'}
          </button>
        </div>
      </div>
    </div>
  )
}
