import React, { useEffect, useState } from 'react'
import { X, Pencil } from 'lucide-react'
import { Member } from '../types'

interface Props {
  member: Member
  onClose: () => void
  onEdit: () => void
}

export default function MemberDetailDialog({ member, onClose, onEdit }: Props) {
  const [history, setHistory] = useState<any[]>([])
  const [activeLoans, setActiveLoans] = useState<any[]>([])
  const [tab, setTab] = useState<'details' | 'active' | 'history'>('details')

  useEffect(() => {
    window.api.getMemberHistory(member.id).then(setHistory)
    window.api.getMemberActiveLoans(member.id).then(setActiveLoans)
  }, [member.id])

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'badge-success', suspended: 'badge-warning', expired: 'badge-neutral', deactivated: 'badge-danger' }
    return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>
  }

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-lg">
        <div className="dialog-header">
          <div>
            <div className="dialog-title">{member.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {member.member_id} &nbsp;·&nbsp; {member.department || 'No department'} &nbsp;·&nbsp; {statusBadge(member.status)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onEdit}><Pencil size={13} /> Edit</button>
            <button className="dialog-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 20px', background: '#fafbfd' }}>
          {(['details', 'active', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent', marginBottom: -1
              }}
            >
              {t === 'active' ? `Active Loans (${activeLoans.length})` : t === 'history' ? `History (${history.length})` : 'Details'}
            </button>
          ))}
        </div>

        <div className="dialog-body">
          {tab === 'details' && (
            <div className="detail-grid">
              {[
                ['Member ID', member.member_id],
                ['Registration No.', member.registration_number || '—'],
                ['Department', member.department || '—'],
                ['Course / Designation', member.course || '—'],
                ['Email', member.email || '—'],
                ['Phone', member.phone || '—'],
                ['Membership Type', member.membership_type_name || '—'],
                ['Status', member.status],
                ['Membership Start', member.membership_start || '—'],
                ['Membership Expiry', member.membership_expiry || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="detail-row">
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value}</span>
                </div>
              ))}
              {member.notes && (
                <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{member.notes}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'active' && (
            activeLoans.length === 0 ? (
              <div className="table-empty">No active loans</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Book</th><th>Accession No.</th><th>Issue Date</th><th>Due Date</th><th>Status</th></tr></thead>
                <tbody>
                  {activeLoans.map((l: any) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{l.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{l.author}</div>
                      </td>
                      <td className="cell-mono">{l.accession_number}</td>
                      <td style={{ fontSize: 12 }}>{l.issue_date}</td>
                      <td style={{ fontSize: 12 }}>{l.due_date}</td>
                      <td>
                        {new Date(l.due_date) < new Date()
                          ? <span className="badge badge-danger">Overdue</span>
                          : <span className="badge badge-success">Active</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'history' && (
            history.length === 0 ? <div className="table-empty">No borrowing history</div> : (
              <table className="data-table">
                <thead><tr><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th><th>Status</th></tr></thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{h.book_title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{h.accession_number}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{h.issue_date}</td>
                      <td style={{ fontSize: 12 }}>{h.due_date}</td>
                      <td style={{ fontSize: 12 }}>{h.return_date || '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        {h.fine_amount ? `₹${h.fine_amount.toFixed(2)}` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${h.status === 'returned' ? 'badge-neutral' : h.status === 'overdue' ? 'badge-danger' : 'badge-success'}`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
