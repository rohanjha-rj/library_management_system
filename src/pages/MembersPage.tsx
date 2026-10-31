import React, { useState, useEffect } from 'react'
import { Plus, Search, Users, Pencil, Eye, X, ChevronLeft, ChevronRight, UserX } from 'lucide-react'
import { Member, MembershipType } from '../types'
import { useApp } from '../context/AppContext'
import MemberDialog from '../components/MemberDialog'
import MemberDetailDialog from '../components/MemberDetailDialog'

export default function MembersPage() {
  const { showToast } = useApp()
  const [members, setMembers] = useState<Member[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [detailMember, setDetailMember] = useState<Member | null>(null)
  const LIMIT = 20

  async function loadMembers(p = page) {
    setLoading(true)
    try {
      const res = await window.api.getMembers({
        search: search || undefined,
        status: statusFilter || undefined,
        membership_type_id: typeFilter || undefined,
        page: p, limit: LIMIT
      })
      setMembers(res.members)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.api.getMembershipTypes().then(setMembershipTypes)
  }, [])

  useEffect(() => { loadMembers(page) }, [search, statusFilter, typeFilter, page])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'badge-success', suspended: 'badge-warning',
      expired: 'badge-neutral', deactivated: 'badge-danger'
    }
    return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Members</h1>
          <span className="page-subtitle">— {total.toLocaleString()} total records</span>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditMember(null); setDialogOpen(true) }}>
            <Plus size={14} /> Add Member
          </button>
        </div>
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={13} className="search-bar-icon" />
            <input
              placeholder="Search name, ID, registration, email…"
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
        <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <select className="filter-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          {membershipTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="toolbar-spacer" />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{total} member{total !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '16px 24px' }}>
        <div className="table-container" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="page-loading"><div className="loading-spinner" /></div>
            ) : members.length === 0 ? (
              <div className="table-empty">
                <Users size={36} className="table-empty-icon" />
                <div className="table-empty-title">No members found</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Membership</th>
                    <th>Expiry</th>
                    <th>Active Loans</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id}>
                      <td className="cell-mono">{member.member_id}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{member.full_name}</div>
                        {member.course && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{member.course}</div>}
                      </td>
                      <td className="cell-muted">{member.department || '—'}</td>
                      <td>{member.membership_type_name ? <span className="chip">{member.membership_type_name}</span> : '—'}</td>
                      <td className="cell-muted">{member.membership_expiry || '—'}</td>
                      <td>
                        {(member.active_loans || 0) > 0
                          ? <span className="badge badge-info">{member.active_loans}</span>
                          : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>0</span>}
                      </td>
                      <td>{statusBadge(member.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button className="btn btn-ghost btn-icon" title="View Profile" onClick={() => setDetailMember(member)}>
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => { setEditMember(member); setDialogOpen(true) }}>
                            <Pencil size={14} />
                          </button>
                        </div>
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

      {dialogOpen && (
        <MemberDialog
          member={editMember}
          membershipTypes={membershipTypes}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { setDialogOpen(false); loadMembers() }}
        />
      )}

      {detailMember && (
        <MemberDetailDialog
          member={detailMember}
          onClose={() => setDetailMember(null)}
          onEdit={() => { setEditMember(detailMember); setDetailMember(null); setDialogOpen(true) }}
        />
      )}
    </>
  )
}
