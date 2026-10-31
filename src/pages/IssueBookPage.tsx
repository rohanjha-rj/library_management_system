import React, { useState, useEffect } from 'react'
import { Search, BookOpen, CheckCircle, AlertCircle, User, X, ArrowRightLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function IssueBookPage() {
  const { user, showToast } = useApp()
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [memberLoans, setMemberLoans] = useState<any[]>([])

  const [bookSearch, setBookSearch] = useState('')
  const [bookResults, setBookResults] = useState<any[]>([])
  const [selectedCopy, setSelectedCopy] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [copies, setCopies] = useState<any[]>([])

  const [issuing, setIssuing] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Member search
  useEffect(() => {
    if (!memberSearch.trim()) { setMemberResults([]); return }
    const t = setTimeout(async () => {
      const res = await window.api.getMembers({ search: memberSearch, limit: 8 })
      setMemberResults(res.members)
    }, 200)
    return () => clearTimeout(t)
  }, [memberSearch])

  async function selectMember(m: any) {
    setSelectedMember(m)
    setMemberSearch('')
    setMemberResults([])
    const loans = await window.api.getMemberActiveLoans(m.id)
    setMemberLoans(loans)
  }

  // Book search
  useEffect(() => {
    if (!bookSearch.trim()) { setBookResults([]); return }
    const t = setTimeout(async () => {
      const res = await window.api.getBooks({ search: bookSearch, availability: 'available', limit: 10 })
      setBookResults(res.books)
    }, 200)
    return () => clearTimeout(t)
  }, [bookSearch])

  async function selectBook(book: any) {
    setSelectedBook(book)
    setBookSearch('')
    setBookResults([])
    const bookCopies = await window.api.getBookCopies(book.id)
    const available = bookCopies.filter((c: any) => c.is_available)
    setCopies(available)
    if (available.length > 0) setSelectedCopy(available[0])
    else setSelectedCopy(null)
  }

  async function handleIssue() {
    if (!selectedMember || !selectedCopy) return
    setIssuing(true)
    setResult(null)
    try {
      const res = await window.api.issueBook({
        member_id: selectedMember.id,
        book_copy_id: selectedCopy.id,
        issued_by: user!.id,
      })
      setResult(res)
      if (res.success) {
        showToast(`Book issued to ${selectedMember.full_name}`)
        // Reset form
        setSelectedMember(null)
        setSelectedBook(null)
        setSelectedCopy(null)
        setCopies([])
        setMemberLoans([])
      }
    } finally {
      setIssuing(false)
    }
  }

  const memberStatus = selectedMember?.status
  const isExpired = selectedMember?.membership_expiry && selectedMember.membership_expiry < new Date().toISOString().split('T')[0]
  const atLimit = selectedMember && memberLoans.length >= (selectedMember.max_books || 3)
  const canIssue = selectedMember && selectedCopy && memberStatus === 'active' && !isExpired && !atLimit

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <ArrowRightLeft size={18} color="var(--color-text-muted)" />
          <h1 className="page-title">Issue Book</h1>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 880, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Member Selection */}
          <div className="section">
            <div className="section-header">
              <span className="section-title">1. Select Member</span>
              {selectedMember && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedMember(null); setMemberLoans([]) }}>
                  <X size={13} /> Clear
                </button>
              )}
            </div>
            <div style={{ padding: '12px 16px' }}>
              {!selectedMember ? (
                <div style={{ position: 'relative' }}>
                  <div className="search-bar">
                    <Search size={13} className="search-bar-icon" />
                    <input
                      placeholder="Search member by name, ID, or email…"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {memberResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', marginTop: 4,
                      maxHeight: 280, overflowY: 'auto'
                    }}>
                      {memberResults.map((m: any) => (
                        <div
                          key={m.id}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-divider)' }}
                          onClick={() => selectMember(m)}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-row-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{m.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {m.member_id} &nbsp;·&nbsp; {m.membership_type_name || 'No type'} &nbsp;·&nbsp;
                            <span style={{ color: m.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)' }}>{m.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {memberSearch && memberResults.length === 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>No members found</div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} color="var(--color-accent)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{selectedMember.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{selectedMember.member_id} · {selectedMember.department}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: 2, fontSize: 11 }}>Membership</div>
                      <div>{selectedMember.membership_type_name || '—'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: 2, fontSize: 11 }}>Status</div>
                      <span className={`badge ${memberStatus === 'active' ? 'badge-success' : 'badge-danger'}`}>{memberStatus}</span>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: 2, fontSize: 11 }}>Expiry</div>
                      <div style={{ color: isExpired ? 'var(--color-danger)' : undefined }}>{selectedMember.membership_expiry || '—'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: 2, fontSize: 11 }}>Active Loans</div>
                      <div style={{ color: atLimit ? 'var(--color-danger)' : undefined }}>
                        {memberLoans.length} / {selectedMember.max_books || 3}
                      </div>
                    </div>
                  </div>

                  {isExpired && (
                    <div className="alert alert-error" style={{ marginTop: 10, padding: '6px 10px', fontSize: 12 }}>
                      Membership has expired. Please renew before issuing.
                    </div>
                  )}
                  {atLimit && !isExpired && (
                    <div className="alert alert-warning" style={{ marginTop: 10, padding: '6px 10px', fontSize: 12 }}>
                      Borrowing limit of {selectedMember.max_books || 3} books reached.
                    </div>
                  )}
                  {memberStatus !== 'active' && (
                    <div className="alert alert-error" style={{ marginTop: 10, padding: '6px 10px', fontSize: 12 }}>
                      Account is {memberStatus}. Cannot issue books.
                    </div>
                  )}

                  {memberLoans.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>CURRENT LOANS</div>
                      {memberLoans.map((loan: any) => (
                        <div key={loan.id} style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--color-divider)', display: 'flex', justifyContent: 'space-between' }}>
                          <span className="ellipsis" style={{ maxWidth: 200 }}>{loan.title}</span>
                          <span style={{ color: new Date(loan.due_date) < new Date() ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                            Due: {loan.due_date}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Book Selection */}
          <div className="section">
            <div className="section-header">
              <span className="section-title">2. Select Book</span>
              {selectedBook && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedBook(null); setSelectedCopy(null); setCopies([]) }}>
                  <X size={13} /> Clear
                </button>
              )}
            </div>
            <div style={{ padding: '12px 16px' }}>
              {!selectedBook ? (
                <div style={{ position: 'relative' }}>
                  <div className="search-bar">
                    <Search size={13} className="search-bar-icon" />
                    <input
                      placeholder="Search available books by title, ISBN…"
                      value={bookSearch}
                      onChange={e => setBookSearch(e.target.value)}
                    />
                  </div>
                  {bookResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', marginTop: 4,
                      maxHeight: 280, overflowY: 'auto'
                    }}>
                      {bookResults.map((b: any) => (
                        <div key={b.id}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-divider)' }}
                          onClick={() => selectBook(b)}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-row-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{b.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {b.author} · {b.available_copies} copies available
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {bookSearch && bookResults.length === 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>No available books found</div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={18} color="var(--color-accent)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }} className="ellipsis">{selectedBook.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{selectedBook.author}</div>
                      {selectedBook.isbn && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>ISBN: {selectedBook.isbn}</div>}
                    </div>
                  </div>

                  {copies.length === 0 ? (
                    <div className="alert alert-error" style={{ padding: '6px 10px', fontSize: 12 }}>
                      No available copies for this book
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>SELECT COPY</div>
                      {copies.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCopy(c)}
                          style={{
                            padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 4,
                            border: `1px solid ${selectedCopy?.id === c.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            background: selectedCopy?.id === c.id ? 'var(--color-accent-light)' : undefined,
                            display: 'flex', alignItems: 'center', gap: 8
                          }}
                        >
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selectedCopy?.id === c.id ? 'var(--color-accent)' : 'var(--color-border)'}`, background: selectedCopy?.id === c.id ? 'var(--color-accent)' : undefined }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>Accession: {c.accession_number}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Condition: {c.condition}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Issue Summary + Action */}
        <div style={{ maxWidth: 880, marginTop: 20 }}>
          <div className="section">
            <div className="section-header">
              <span className="section-title">3. Confirm & Issue</span>
            </div>
            <div style={{ padding: '16px 16px' }}>
              {result && (
                <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 14 }}>
                  {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <div>
                    {result.success
                      ? <><strong>Book issued successfully!</strong> Due date: <strong>{result.dueDate}</strong>
                        {result.pendingFines > 0 && <span style={{ marginLeft: 8, fontSize: 12 }}>⚠ Member has ₹{result.pendingFines.toFixed(2)} in pending fines</span>}</>
                      : <>{result.error}</>
                    }
                  </div>
                </div>
              )}

              {selectedMember && selectedBook && selectedCopy ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong>{selectedMember.full_name}</strong> ({selectedMember.member_id})
                    &nbsp;⟵ borrow ⟶&nbsp;
                    <strong>{selectedBook.title}</strong>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                      Acc: {selectedCopy.accession_number}
                    </span>
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleIssue}
                    disabled={!canIssue || issuing}
                  >
                    {issuing ? <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <ArrowRightLeft size={15} />}
                    {issuing ? 'Issuing…' : 'Confirm Issue'}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Select a member and an available book copy to proceed.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
