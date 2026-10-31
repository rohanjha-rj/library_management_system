import React, { useState, useEffect } from 'react'
import { Search, List, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ActiveLoansPage() {
  const { setCurrentPage } = useApp()
  const [loans, setLoans] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const LIMIT = 20

  async function loadLoans(p = page) {
    setLoading(true)
    try {
      const res = await window.api.getActiveLoans({
        search: search || undefined,
        overdue_only: overdueOnly || undefined,
        page: p, limit: LIMIT
      })
      setLoans(res.loans)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLoans(page) }, [search, overdueOnly, page])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <List size={18} color="var(--color-text-muted)" />
          <h1 className="page-title">Active Loans</h1>
          <span className="page-subtitle">— {total.toLocaleString()} active</span>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => loadLoans(page)}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setCurrentPage('circulation-return')}>
            Process Return
          </button>
        </div>
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={13} className="search-bar-icon" />
            <input
              placeholder="Search member, book title, accession number…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={overdueOnly} onChange={e => { setOverdueOnly(e.target.checked); setPage(1) }} />
          Show overdue only
        </label>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{total} loan{total !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '16px 24px' }}>
        <div className="table-container" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="page-loading"><div className="loading-spinner" /></div>
            ) : loans.length === 0 ? (
              <div className="table-empty">
                <List size={36} className="table-empty-icon" />
                <div className="table-empty-title">No active loans found</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Book</th>
                    <th>Accession No.</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Overdue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => (
                    <tr key={loan.id} style={{ background: loan.overdue_days > 0 ? 'var(--color-overdue-bg)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{loan.member_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{loan.member_code} · {loan.department}</div>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <div className="ellipsis" style={{ fontSize: 13 }}>{loan.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{loan.author}</div>
                      </td>
                      <td className="cell-mono">{loan.accession_number}</td>
                      <td style={{ fontSize: 12 }}>{loan.issue_date}</td>
                      <td style={{ fontSize: 12, color: loan.overdue_days > 0 ? 'var(--color-danger)' : undefined, fontWeight: loan.overdue_days > 0 ? 600 : 400 }}>
                        {loan.due_date}
                      </td>
                      <td>
                        {loan.overdue_days > 0
                          ? <span className="badge badge-danger">{loan.overdue_days}d</span>
                          : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {loan.overdue_days > 0
                          ? <span className="badge badge-danger">Overdue</span>
                          : <span className="badge badge-success">Active</span>}
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
    </>
  )
}
