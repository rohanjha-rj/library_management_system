import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Search, BookOpen, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react'
import { Book, Category } from '../types'
import { useApp } from '../context/AppContext'
import BookDialog from '../components/BookDialog'
import BookDetailDialog from '../components/BookDetailDialog'

export default function BooksPage() {
  const { showToast } = useApp()
  const [books, setBooks] = useState<Book[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [availFilter, setAvailFilter] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBook, setEditBook] = useState<Book | null>(null)
  const [detailBook, setDetailBook] = useState<Book | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Book | null>(null)
  const LIMIT = 20

  async function loadBooks(p = page) {
    setLoading(true)
    try {
      const res = await window.api.getBooks({
        search: search || undefined,
        category_id: categoryFilter || undefined,
        availability: availFilter || undefined,
        page: p, limit: LIMIT
      })
      setBooks(res.books)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    const cats = await window.api.getCategories()
    setCategories(cats)
  }

  useEffect(() => { loadCategories() }, [])
  useEffect(() => { loadBooks(page) }, [search, categoryFilter, availFilter, page])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  async function handleDelete(book: Book) {
    const res = await window.api.deleteBook(book.id)
    if (res.success) {
      showToast(`"${book.title}" deleted`)
      loadBooks()
    } else {
      showToast(res.error || 'Delete failed', 'error')
    }
    setDeleteConfirm(null)
  }

  const totalPages = Math.ceil(total / LIMIT)
  const availabilityBadge = (book: Book) => {
    if (book.available_copies === 0) return <span className="badge badge-danger">Unavailable</span>
    if (book.available_copies < book.total_copies / 2) return <span className="badge badge-warning">{book.available_copies}/{book.total_copies}</span>
    return <span className="badge badge-success">{book.available_copies}/{book.total_copies}</span>
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Books</h1>
          <span className="page-subtitle">— {total.toLocaleString()} total records</span>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditBook(null); setDialogOpen(true) }}>
            <Plus size={14} /> Add Book
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={13} className="search-bar-icon" />
            <input
              placeholder="Search title, author, ISBN, publisher…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <select className="filter-select" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="filter-select" value={availFilter} onChange={e => { setAvailFilter(e.target.value); setPage(1) }}>
          <option value="">All Availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>

        <div className="toolbar-spacer" />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {total} book{total !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '16px 24px' }}>
        <div className="table-container" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="page-loading"><div className="loading-spinner" /></div>
            ) : books.length === 0 ? (
              <div className="table-empty">
                <BookOpen size={36} className="table-empty-icon" />
                <div className="table-empty-title">No books found</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {search ? 'Try a different search term' : 'Add your first book to get started'}
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title / Author</th>
                    <th>ISBN</th>
                    <th>Category</th>
                    <th>Edition</th>
                    <th>Shelf</th>
                    <th>Availability</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr key={book.id}>
                      <td style={{ maxWidth: 260 }}>
                        <div className="ellipsis" style={{ fontWeight: 500 }}>{book.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }} className="ellipsis">{book.author}</div>
                      </td>
                      <td className="cell-mono">{book.isbn || '—'}</td>
                      <td>{book.category_name ? <span className="chip">{book.category_name}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                      <td className="cell-muted">{book.edition || '—'}</td>
                      <td className="cell-mono">{book.shelf_number || '—'}</td>
                      <td>{availabilityBadge(book)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button className="btn btn-ghost btn-icon" title="View Details" onClick={() => setDetailBook(book)}>
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => { setEditBook(book); setDialogOpen(true) }}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon" title="Delete" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteConfirm(book)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span>Page {page} of {totalPages}</span>
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              })}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <BookDialog
          book={editBook}
          categories={categories}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); loadBooks(); loadCategories() }}
        />
      )}

      {/* Detail Dialog */}
      {detailBook && (
        <BookDetailDialog
          book={detailBook}
          onClose={() => setDetailBook(null)}
          onEdit={() => { setEditBook(detailBook); setDetailBook(null); setDialogOpen(true) }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="dialog-overlay">
          <div className="dialog dialog-sm">
            <div className="dialog-header">
              <span className="dialog-title">Delete Book</span>
              <button className="dialog-close" onClick={() => setDeleteConfirm(null)}><X size={16} /></button>
            </div>
            <div className="dialog-body">
              <div className="alert alert-error">
                <Trash2 size={16} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Confirm Deletion</div>
                  <div>Are you sure you want to delete "<strong>{deleteConfirm.title}</strong>"? This action cannot be undone.</div>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete Book</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
