import React, { useEffect, useState } from 'react'
import {
  BookOpen, Users, ArrowRightLeft, AlertTriangle, BookMarked, Clock,
  DollarSign, TrendingUp, RefreshCw
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DashboardStats } from '../types'
import { useApp } from '../context/AppContext'
import { format, parseISO } from 'date-fns'

export default function Dashboard() {
  const { setCurrentPage } = useApp()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTxns, setRecentTxns] = useState<any[]>([])
  const [overdue, setOverdue] = useState<any[]>([])
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([])
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const [s, txns, ov, up, mb, ms] = await Promise.all([
        window.api.getDashboardStats(),
        window.api.getRecentTransactions(),
        window.api.getOverdueBooks(),
        window.api.getUpcomingDues(),
        window.api.getMostBorrowed(),
        window.api.getMonthlyStats(),
      ])
      setStats(s)
      setRecentTxns(txns)
      setOverdue(ov)
      setUpcoming(up)
      setMostBorrowed(mb)
      const chartData = (ms as any[]).map((m: any) => ({
        month: m.month ? m.month.slice(0, 7) : '',
        Issued: m.issued || 0,
        Returned: m.returned || 0,
      }))
      setMonthlyStats(chartData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div className="page-loading">
      <div className="loading-spinner" />
      <span>Loading dashboard…</span>
    </div>
  )

  const statCards = [
    { label: 'Total Books', value: stats?.totalBooks ?? 0, sub: `${stats?.totalCopies ?? 0} total copies`, icon: BookOpen, color: '#3a6ea5', bg: '#e8f0f9' },
    { label: 'Available Copies', value: stats?.availableCopies ?? 0, sub: `${stats?.issuedCopies ?? 0} currently issued`, icon: BookMarked, color: '#2d7d4f', bg: '#edf7f2' },
    { label: 'Active Members', value: stats?.totalMembers ?? 0, sub: 'registered members', icon: Users, color: '#6a4fa0', bg: '#f3effe' },
    { label: 'Overdue Books', value: stats?.overdueCount ?? 0, sub: 'need immediate attention', icon: AlertTriangle, color: '#b5373a', bg: '#fdf2f2' },
    { label: 'Issued Today', value: stats?.issuedToday ?? 0, sub: `as of ${format(new Date(), 'MMM d, yyyy')}`, icon: ArrowRightLeft, color: '#916a00', bg: '#fef8e7' },
    { label: 'Pending Fines', value: stats?.pendingFines ?? 0, sub: `₹${(stats?.totalFineAmount ?? 0).toFixed(2)} outstanding`, icon: DollarSign, color: '#b5373a', bg: '#fdf2f2' },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <span className="page-subtitle">— {format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          {statCards.map(card => (
            <div key={card.label} className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">{card.label}</span>
                <div className="stat-card-icon" style={{ background: card.bg }}>
                  <card.icon size={15} color={card.color} />
                </div>
              </div>
              <div className="stat-card-value" style={{ color: card.value > 0 && card.label === 'Overdue Books' ? 'var(--color-danger)' : undefined }}>
                {card.value.toLocaleString()}
              </div>
              <div className="stat-card-sub">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Monthly chart */}
          <div className="section" style={{ gridColumn: '1 / -1' }}>
            <div className="section-header">
              <span className="section-title">Circulation — Last 12 Months</span>
              <TrendingUp size={15} color="var(--color-text-muted)" />
            </div>
            <div style={{ padding: '16px 20px', height: 220 }}>
              {monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyStats} barSize={12} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 5, boxShadow: 'var(--shadow-sm)' }}
                      cursor={{ fill: 'var(--color-row-hover)' }}
                    />
                    <Bar dataKey="Issued" fill="#3a6ea5" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Returned" fill="#4a8c6f" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  No circulation data yet
                </div>
              )}
            </div>
          </div>

          {/* Overdue */}
          <div className="section">
            <div className="section-header">
              <span className="section-title" style={{ color: 'var(--color-danger)' }}>⚠ Overdue Books</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('circulation-active')}>
                View all
              </button>
            </div>
            {overdue.length === 0 ? (
              <div className="table-empty" style={{ padding: 28 }}>
                <div style={{ fontSize: 13, color: 'var(--color-success)' }}>No overdue books</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Book</th>
                    <th>Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.slice(0, 6).map((row: any) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{row.member_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.member_code}</div>
                      </td>
                      <td className="ellipsis" style={{ maxWidth: 160, fontSize: 12 }}>{row.title}</td>
                      <td>
                        <span className="badge badge-danger">{row.overdue_days}d</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Upcoming dues */}
          <div className="section">
            <div className="section-header">
              <span className="section-title">
                <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Due in Next 7 Days
              </span>
            </div>
            {upcoming.length === 0 ? (
              <div className="table-empty" style={{ padding: 28 }}>
                <div style={{ fontSize: 13 }}>No books due soon</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Book</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.slice(0, 6).map((row: any) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{row.member_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.member_code}</div>
                      </td>
                      <td className="ellipsis" style={{ maxWidth: 160, fontSize: 12 }}>{row.title}</td>
                      <td>
                        <span className={`badge ${row.days_remaining <= 2 ? 'badge-warning' : 'badge-neutral'}`}>
                          {row.days_remaining === 0 ? 'Today' : `${row.days_remaining}d`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent transactions */}
          <div className="section">
            <div className="section-header">
              <span className="section-title">Recent Transactions</span>
            </div>
            {recentTxns.length === 0 ? (
              <div className="table-empty" style={{ padding: 28 }}>No transactions yet</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Book</th>
                    <th>Date</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxns.map((row: any) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{row.member_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.member_code}</div>
                      </td>
                      <td className="ellipsis" style={{ maxWidth: 160, fontSize: 12 }}>{row.book_title}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{row.date}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{row.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Most borrowed */}
          <div className="section">
            <div className="section-header">
              <span className="section-title">Most Borrowed Books</span>
            </div>
            {mostBorrowed.length === 0 ? (
              <div className="table-empty" style={{ padding: 28 }}>No data yet</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Borrows</th>
                  </tr>
                </thead>
                <tbody>
                  {mostBorrowed.slice(0, 8).map((row: any, i: number) => (
                    <tr key={row.id}>
                      <td style={{ width: 28, color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontSize: 12 }}>
                        <div className="ellipsis" style={{ maxWidth: 160, fontWeight: 500 }}>{row.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.author}</div>
                      </td>
                      <td><span className="chip" style={{ fontSize: 10 }}>{row.category_name || '—'}</span></td>
                      <td><span className="badge badge-info">{row.borrow_count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
