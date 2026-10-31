import React, { useEffect, useState } from 'react'
import { X, Pencil } from 'lucide-react'
import { Book, BookCopy as BookCopyType } from '../types'

interface Props {
  book: Book
  onClose: () => void
  onEdit: () => void
}

export default function BookDetailDialog({ book, onClose, onEdit }: Props) {
  const [copies, setCopies] = useState<BookCopyType[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [tab, setTab] = useState<'details' | 'copies' | 'history'>('details')

  useEffect(() => {
    window.api.getBookCopies(book.id).then(setCopies)
    window.api.getBookHistory(book.id).then(setHistory)
  }, [book.id])

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-lg">
        <div className="dialog-header">
          <div>
            <div className="dialog-title">{book.title}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{book.author}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onEdit}><Pencil size={13} /> Edit</button>
            <button className="dialog-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', padding: '0 20px', background: '#fafbfd' }}>
          {(['details', 'copies', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'copies' && ` (${copies.length})`}
              {t === 'history' && ` (${history.length})`}
            </button>
          ))}
        </div>

        <div className="dialog-body">
          {tab === 'details' && (
            <div className="detail-grid">
              {[
                ['ISBN', book.isbn || '—'],
                ['Publisher', book.publisher || '—'],
                ['Edition', book.edition || '—'],
                ['Year', book.publication_year || '—'],
                ['Category', book.category_name || '—'],
                ['Language', book.language || '—'],
                ['Shelf Number', book.shelf_number || '—'],
                ['Total Copies', book.total_copies],
                ['Available Copies', book.available_copies],
              ].map(([label, value]) => (
                <div key={label as string} className="detail-row">
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value}</span>
                </div>
              ))}
              {book.description && (
                <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">Description</span>
                  <span className="detail-value" style={{ lineHeight: 1.6 }}>{book.description}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'copies' && (
            copies.length === 0 ? <div className="table-empty">No copies recorded</div> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Accession No.</th>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Borrowed By</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {copies.map(c => (
                    <tr key={c.id}>
                      <td className="cell-mono">{c.accession_number}</td>
                      <td>{c.condition}</td>
                      <td>
                        {c.is_available
                          ? <span className="badge badge-success">Available</span>
                          : <span className="badge badge-danger">Issued</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{c.borrowed_by || '—'}</td>
                      <td style={{ fontSize: 12 }}>{c.due_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'history' && (
            history.length === 0 ? <div className="table-empty">No borrowing history</div> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Accession No.</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Returned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{h.member_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{h.member_code}</div>
                      </td>
                      <td className="cell-mono">{h.accession_number}</td>
                      <td style={{ fontSize: 12 }}>{h.issue_date}</td>
                      <td style={{ fontSize: 12 }}>{h.due_date}</td>
                      <td style={{ fontSize: 12 }}>{h.return_date || '—'}</td>
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
