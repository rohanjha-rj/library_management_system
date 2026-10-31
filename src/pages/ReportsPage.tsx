import React, { useState, useEffect } from 'react'
import { BarChart2, Download, Calendar, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

type ReportType = 'inventory' | 'issued' | 'returns' | 'fines' | 'members'

export default function ReportsPage() {
  const { showToast } = useApp()
  const [reportType, setReportType] = useState<ReportType>('inventory')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function loadReport() {
    setLoading(true)
    setData([])
    try {
      const params = {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        status: statusFilter || undefined,
      }
      let rows: any[] = []
      if (reportType === 'inventory') rows = await window.api.getInventoryReport(params)
      else if (reportType === 'issued') rows = await window.api.getIssuedReport(params)
      else if (reportType === 'returns') rows = await window.api.getReturnReport(params)
      else if (reportType === 'fines') rows = await window.api.getFineReport(params)
      else if (reportType === 'members') rows = await window.api.getMemberReport(params)
      setData(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [reportType, fromDate, toDate, statusFilter])

  async function handleExport() {
    if (!data.length) return
    const res = await window.api.exportReport({ rows: data })
    if (res.success) {
      // Create and trigger download via data URI
      const blob = new Blob([res.csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Report exported as CSV')
    }
  }

  const REPORT_CONFIGS: Record<ReportType, { label: string; columns: { key: string; label: string }[] }> = {
    inventory: {
      label: 'Book Inventory',
      columns: [
        { key: 'title', label: 'Title' }, { key: 'author', label: 'Author' }, { key: 'isbn', label: 'ISBN' },
        { key: 'category_name', label: 'Category' }, { key: 'copy_count', label: 'Total Copies' },
        { key: 'avail_count', label: 'Available' }, { key: 'shelf_number', label: 'Shelf' },
      ]
    },
    issued: {
      label: 'Currently Issued Books',
      columns: [
        { key: 'member_name', label: 'Member' }, { key: 'member_code', label: 'Member ID' },
        { key: 'title', label: 'Book' }, { key: 'accession_number', label: 'Accession No.' },
        { key: 'issue_date', label: 'Issue Date' }, { key: 'due_date', label: 'Due Date' },
        { key: 'overdue_days', label: 'Overdue Days' },
      ]
    },
    returns: {
      label: 'Book Returns',
      columns: [
        { key: 'member_name', label: 'Member' }, { key: 'member_code', label: 'Member ID' },
        { key: 'title', label: 'Book' }, { key: 'accession_number', label: 'Accession No.' },
        { key: 'issue_date', label: 'Issue Date' }, { key: 'due_date', label: 'Due Date' },
        { key: 'return_date', label: 'Return Date' }, { key: 'overdue_days', label: 'Overdue Days' },
      ]
    },
    fines: {
      label: 'Fine Records',
      columns: [
        { key: 'member_name', label: 'Member' }, { key: 'member_code', label: 'Member ID' },
        { key: 'title', label: 'Book' }, { key: 'overdue_days', label: 'Overdue Days' },
        { key: 'amount', label: 'Fine Amount' }, { key: 'status', label: 'Status' },
        { key: 'issue_date', label: 'Issue Date' }, { key: 'due_date', label: 'Due Date' },
      ]
    },
    members: {
      label: 'Member Report',
      columns: [
        { key: 'member_id', label: 'Member ID' }, { key: 'full_name', label: 'Full Name' },
        { key: 'department', label: 'Department' }, { key: 'membership_type_name', label: 'Type' },
        { key: 'total_borrows', label: 'Total Borrows' }, { key: 'active_loans', label: 'Active Loans' },
        { key: 'pending_fines', label: 'Pending Fines (₹)' }, { key: 'status', label: 'Status' },
        { key: 'membership_expiry', label: 'Expiry' },
      ]
    }
  }

  const config = REPORT_CONFIGS[reportType]
  const showDateFilter = reportType !== 'inventory' && reportType !== 'members'
  const showStatusFilter = reportType === 'fines' || reportType === 'members'

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <BarChart2 size={18} color="var(--color-text-muted)" />
          <h1 className="page-title">Reports</h1>
          <span className="page-subtitle">— {data.length} records</span>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleExport} disabled={!data.length}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.entries(REPORT_CONFIGS) as [ReportType, any][]).map(([key, conf]) => (
            <button
              key={key}
              className={`btn ${reportType === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setReportType(key)}
            >
              {conf.label}
            </button>
          ))}
        </div>
        <div className="toolbar-spacer" />
        {showDateFilter && (
          <>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> From
            </label>
            <input className="form-input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              style={{ width: 140, padding: '4px 8px', fontSize: 12 }} />
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>To</label>
            <input className="form-input" type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              style={{ width: 140, padding: '4px 8px', fontSize: 12 }} />
            {(fromDate || toDate) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setFromDate(''); setToDate('') }}>
                <X size={12} /> Clear
              </button>
            )}
          </>
        )}
        {showStatusFilter && reportType === 'fines' && (
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </select>
        )}
        {showStatusFilter && reportType === 'members' && (
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '16px 24px' }}>
        <div className="table-container" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            {loading ? (
              <div className="page-loading"><div className="loading-spinner" /></div>
            ) : data.length === 0 ? (
              <div className="table-empty">
                <BarChart2 size={36} className="table-empty-icon" />
                <div className="table-empty-title">No data for selected report</div>
              </div>
            ) : (
              <table className="data-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    {config.columns.map(col => <th key={col.key}>{col.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i}>
                      {config.columns.map(col => (
                        <td key={col.key} style={{ fontSize: 12, maxWidth: 200 }}>
                          {col.key === 'amount' || col.key === 'pending_fines'
                            ? (row[col.key] != null ? `₹${Number(row[col.key]).toFixed(2)}` : '—')
                            : col.key === 'avail_count' && row['copy_count']
                              ? `${row[col.key]} / ${row['copy_count']}`
                              : (row[col.key] ?? '—') + ''
                          }
                        </td>
                      ))}
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
