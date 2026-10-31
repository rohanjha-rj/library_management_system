import React, { useState, useEffect } from 'react'
import { DollarSign, Search, X, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { FineRecord } from '../types'
import { useApp } from '../context/AppContext'

export default function FinesPage() {
  const { user, showToast } = useApp()
  const [fines, setFines] = useState<FineRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [payDialog, setPayDialog] = useState<FineRecord | null>(null)
  const [waiveDialog, setWaiveDialog] = useState<FineRecord | null>(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [waiveReason, setWaiveReason] = useState('')
  const LIMIT = 20

  async function loadFines(p = page) {
    setLoading(true)
    try {
      const res = await window.api.getFines({
        search: search || undefined,
        status: statusFilter || undefined,
        page: p, limit: LIMIT
      })
      setFines(res.fines)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFines(page) }, [search, statusFilter, page])

  async function handlePay() {
    if (!payDialog) return
    const res = await window.api.payFine({
      fine_id: payDialog.id,
      payment_method: payMethod,
      received_by: user!.id,
    })
    if (res.success) {
      showToast(`Fine of ₹${payDialog.amount.toFixed(2)} marked as paid`)
      setPayDialog(null)
      loadFines()
    } else {
      showToast(res.error || 'Payment failed', 'error')
    }
  }

  async function handleWaive() {
    if (!waiveDialog || !waiveReason.trim()) return
    const res = await window.api.waiveFine({
      fine_id: waiveDialog.id,
      reason: waiveReason,
      waived_by: user!.id,
    })
    if (res.success) {
      showToast('Fine waived successfully')
      setWaiveDialog(null)
      setWaiveReason('')
      loadFines()
    } else {
      showToast(res.error || 'Waive failed', 'error')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: 'badge-danger', paid: 'badge-success', waived: 'badge-neutral' }
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <DollarSign size={18} color="var(--color-text-muted)" />
          <h1 className="page-title">Fine Management</h1>
          <span className="page-subtitle">— {total.toLocaleString()} records</span>
        </div>
      </div>

      <div className="toolbar">
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1) }} style={{ display: 'flex', gap: 8 }}>
          <div className="search-bar">
            <Search size={13} className="search-bar-icon" />
            <input placeholder="Search member, book…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>
        <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{total} record{total !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '16px 24px' }}>
        <div className="table-container" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="page-loading"><div className="loading-spinner" /></div>
            ) : fines.length === 0 ? (
              <div className="table-empty">
                <DollarSign size={36} className="table-empty-icon" />
                <div className="table-empty-title">No fine records</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Book</th>
                    <th>Overdue Days</th>
                    <th>Fine Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fines.map(fine => (
                    <tr key={fine.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{fine.member_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fine.member_code}</div>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <div className="ellipsis" style={{ fontSize: 12 }}>{fine.book_title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fine.accession_number}</div>
                      </td>
                      <td>
                        <span className="badge badge-warning">{fine.overdue_days}d</span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 14 }}>₹{fine.amount.toFixed(2)}</td>
                      <td>{statusBadge(fine.status)}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {fine.created_at?.split('T')[0] || fine.created_at}
                      </td>
                      <td>
                        {fine.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button className="btn btn-success btn-sm" onClick={() => setPayDialog(fine)}>
                              <CheckCircle size={13} /> Collect
                            </button>
                            {user?.role === 'administrator' && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setWaiveDialog(fine)}>
                                Waive
                              </button>
                            )}
                          </div>
                        )}
                        {fine.status === 'waived' && fine.waived_reason && (
                          <span title={`Reason: ${fine.waived_reason}`} style={{ fontSize: 11, color: 'var(--color-text-muted)', cursor: 'help' }}>
                            Waived ℹ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <span>Page {page} of {totalPages}</span>
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              })}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Pay Dialog */}
      {payDialog && (
        <div className="dialog-overlay">
          <div className="dialog dialog-sm">
            <div className="dialog-header">
              <span className="dialog-title">Collect Fine Payment</span>
              <button className="dialog-close" onClick={() => setPayDialog(null)}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                Collecting fine for <strong>{payDialog.member_name}</strong> for book <strong>{payDialog.book_title}</strong>.
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>₹{payDialog.amount.toFixed(2)}</div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="online">Online Transfer</option>
                </select>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setPayDialog(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePay}>
                <CheckCircle size={14} /> Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waive Dialog */}
      {waiveDialog && (
        <div className="dialog-overlay">
          <div className="dialog dialog-sm">
            <div className="dialog-header">
              <span className="dialog-title">Waive Fine</span>
              <button className="dialog-close" onClick={() => { setWaiveDialog(null); setWaiveReason('') }}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                Waiving ₹<strong>{waiveDialog.amount.toFixed(2)}</strong> fine for <strong>{waiveDialog.member_name}</strong>.
              </div>
              <div className="form-group">
                <label className="form-label required">Reason for Waiver</label>
                <textarea className="form-textarea" value={waiveReason} onChange={e => setWaiveReason(e.target.value)} rows={3} placeholder="Provide a reason for waiving this fine…" />
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => { setWaiveDialog(null); setWaiveReason('') }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleWaive} disabled={!waiveReason.trim()}>
                <AlertTriangle size={14} /> Waive Fine
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
