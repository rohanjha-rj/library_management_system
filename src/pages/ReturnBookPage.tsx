import React, { useState } from 'react'
import { Search, ArrowDownCircle, CheckCircle, AlertCircle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ReturnBookPage() {
  const { user, showToast } = useApp()
  const [loanSearch, setLoanSearch] = useState('')
  const [loanResults, setLoanResults] = useState<any[]>([])
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [condition, setCondition] = useState('Good')
  const [notes, setNotes] = useState('')
  const [returning, setReturning] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!loanSearch.trim()) return
    const results = await window.api.searchLoans(loanSearch)
    setLoanResults(results)
  }

  async function handleReturn() {
    if (!selectedLoan) return
    setReturning(true)
    setResult(null)
    try {
      const res = await window.api.returnBook({
        issue_id: selectedLoan.id,
        returned_by: user!.id,
        condition,
        notes,
      })
      setResult(res)
      if (res.success) {
        showToast(`Book returned successfully`)
        setSelectedLoan(null)
        setLoanResults([])
        setLoanSearch('')
        setNotes('')
        setCondition('Good')
      }
    } finally {
      setReturning(false)
    }
  }

  const isOverdue = selectedLoan && new Date(selectedLoan.due_date) < new Date()

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <ArrowDownCircle size={18} color="var(--color-text-muted)" />
          <h1 className="page-title">Return Book</h1>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 700 }}>
          {/* Search */}
          <div className="section" style={{ marginBottom: 20 }}>
            <div className="section-header">
              <span className="section-title">Search Active Loan</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                <div className="search-bar" style={{ flex: 1 }}>
                  <Search size={13} className="search-bar-icon" />
                  <input
                    placeholder="Search by member name, member ID, accession number, or book title…"
                    value={loanSearch}
                    onChange={e => setLoanSearch(e.target.value)}
                    autoFocus
                  />
                  {loanSearch && (
                    <button type="button" onClick={() => { setLoanSearch(''); setLoanResults([]) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="submit" className="btn btn-secondary">Search</button>
              </form>

              {loanResults.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <table className="data-table" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Book</th>
                        <th>Accession No.</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanResults.map((loan: any) => (
                        <tr key={loan.id}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 12 }}>{loan.member_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{loan.member_code}</div>
                          </td>
                          <td style={{ maxWidth: 180 }}>
                            <div className="ellipsis" style={{ fontSize: 12 }}>{loan.title}</div>
                          </td>
                          <td className="cell-mono">{loan.accession_number}</td>
                          <td style={{ fontSize: 12 }}>{loan.issue_date}</td>
                          <td style={{ fontSize: 12, color: loan.overdue_days > 0 ? 'var(--color-danger)' : undefined }}>
                            {loan.due_date}
                          </td>
                          <td>
                            {loan.overdue_days > 0
                              ? <span className="badge badge-danger">{loan.overdue_days}d overdue</span>
                              : <span className="badge badge-success">Active</span>}
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => { setSelectedLoan(loan); setLoanResults([]); setLoanSearch('') }}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {loanSearch && loanResults.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>No active loans found matching your search.</div>
              )}
            </div>
          </div>

          {/* Selected loan */}
          {selectedLoan && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Process Return</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedLoan(null); setResult(null) }}>
                  <X size={13} /> Clear
                </button>
              </div>
              <div style={{ padding: '16px' }}>
                {result && (
                  <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 14 }}>
                    {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <div>
                      {result.success ? (
                        <>
                          <strong>Return processed successfully.</strong>
                          {result.fineAmount > 0
                            ? <> A fine of <strong>₹{result.fineAmount.toFixed(2)}</strong> has been applied for <strong>{result.overdueDays}</strong> overdue day(s).</>
                            : <> No fine applicable.</>}
                        </>
                      ) : result.error}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    ['Member', `${selectedLoan.member_name} (${selectedLoan.member_code})`],
                    ['Book', selectedLoan.title],
                    ['Accession No.', selectedLoan.accession_number],
                    ['Issue Date', selectedLoan.issue_date],
                    ['Due Date', selectedLoan.due_date],
                    ['Overdue Days', selectedLoan.overdue_days > 0 ? `${selectedLoan.overdue_days} days` : 'None'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ fontSize: 13 }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontWeight: label === 'Overdue Days' && selectedLoan.overdue_days > 0 ? 600 : 400, color: label === 'Overdue Days' && selectedLoan.overdue_days > 0 ? 'var(--color-danger)' : undefined }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {isOverdue && (
                  <div className="alert alert-warning" style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12 }}>
                    ⚠ This loan is {selectedLoan.overdue_days} day(s) overdue. A fine will be calculated automatically.
                  </div>
                )}

                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Book Condition</label>
                    <select className="form-select" value={condition} onChange={e => setCondition(e.target.value)}>
                      <option>Good</option>
                      <option>Acceptable</option>
                      <option>Damaged</option>
                      <option>Lost</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleReturn}
                  disabled={returning}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {returning ? <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <ArrowDownCircle size={15} />}
                  {returning ? 'Processing…' : 'Confirm Return'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
