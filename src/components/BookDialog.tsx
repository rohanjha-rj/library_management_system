import React, { useState, useEffect } from 'react'
import { X, BookOpen } from 'lucide-react'
import { Book, Category } from '../types'
import { useApp } from '../context/AppContext'

interface Props {
  book: Book | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export default function BookDialog({ book, categories, onClose, onSaved }: Props) {
  const { showToast } = useApp()
  const [form, setForm] = useState({
    title: '', isbn: '', author: '', publisher: '', edition: '',
    publication_year: '', category_id: '', language: 'English',
    shelf_number: '', total_copies: '1', description: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title || '',
        isbn: book.isbn || '',
        author: book.author || '',
        publisher: book.publisher || '',
        edition: book.edition || '',
        publication_year: book.publication_year?.toString() || '',
        category_id: book.category_id?.toString() || '',
        language: book.language || 'English',
        shelf_number: book.shelf_number || '',
        total_copies: book.total_copies?.toString() || '1',
        description: book.description || ''
      })
    }
  }, [book])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.author.trim()) e.author = 'Author is required'
    if (form.total_copies && parseInt(form.total_copies) < 1) e.total_copies = 'Must be at least 1'
    if (form.publication_year && (isNaN(parseInt(form.publication_year)) || parseInt(form.publication_year) < 1800 || parseInt(form.publication_year) > new Date().getFullYear() + 1))
      e.publication_year = 'Enter a valid year'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const data = {
        ...form,
        id: book?.id,
        publication_year: form.publication_year ? parseInt(form.publication_year) : null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        total_copies: parseInt(form.total_copies) || 1,
      }
      const res = book ? await window.api.updateBook(data) : await window.api.createBook(data)
      if (res.success) {
        showToast(book ? 'Book updated successfully' : 'Book added successfully')
        onSaved()
      } else {
        showToast(res.error || 'Failed to save', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleAddCategory() {
    if (!newCat.trim()) return
    await window.api.createCategory(newCat.trim())
    setNewCat('')
    setAddingCat(false)
    showToast(`Category "${newCat}" added`)
    onSaved()
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-lg">
        <div className="dialog-header">
          <span className="dialog-title">{book ? 'Edit Book' : 'Add New Book'}</span>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Title</label>
              <input className="form-input" value={form.title} onChange={f('title')} placeholder="Book title" />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Author(s)</label>
              <input className="form-input" value={form.author} onChange={f('author')} placeholder="Author name(s)" />
              {errors.author && <span className="form-error">{errors.author}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">ISBN</label>
              <input className="form-input" value={form.isbn} onChange={f('isbn')} placeholder="e.g. 9780134610993" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Publisher</label>
              <input className="form-input" value={form.publisher} onChange={f('publisher')} placeholder="Publisher name" />
            </div>
            <div className="form-group">
              <label className="form-label">Edition</label>
              <input className="form-input" value={form.edition} onChange={f('edition')} placeholder="e.g. 5th" />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Publication Year</label>
              <input className="form-input" value={form.publication_year} onChange={f('publication_year')} placeholder="e.g. 2020" type="number" min="1800" max="2030" />
              {errors.publication_year && <span className="form-error">{errors.publication_year}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <input className="form-input" value={form.language} onChange={f('language')} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Copies</label>
              <input className="form-input" type="number" min="1" value={form.total_copies} onChange={f('total_copies')} />
              {errors.total_copies && <span className="form-error">{errors.total_copies}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              {addingCat ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="form-input" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category name" autoFocus />
                  <button className="btn btn-primary btn-sm" onClick={handleAddCategory}>Add</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAddingCat(false)}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <select className="form-select" value={form.category_id} onChange={f('category_id')} style={{ flex: 1 }}>
                    <option value="">— Select —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAddingCat(true)}>+ New</button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Shelf Number</label>
              <input className="form-input" value={form.shelf_number} onChange={f('shelf_number')} placeholder="e.g. CS-A1" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={f('description')} placeholder="Brief description of the book" rows={3} />
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : null}
            {book ? 'Save Changes' : 'Add Book'}
          </button>
        </div>
      </div>
    </div>
  )
}
