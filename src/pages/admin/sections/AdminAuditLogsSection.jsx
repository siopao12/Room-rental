import React, { useState, useEffect } from 'react'
import {
  ClipboardList, Search, Loader2, RefreshCw, Download, Filter,
  ShieldCheck, LogIn, LogOut, Clock, Smartphone, Laptop, User, ShieldAlert
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { decryptObject } from '../../../lib/encryptionHelper'
import { logError } from '../../../lib/errorHandler'

const ACTION_COLORS = {
  APPROVE_APPLICATION: { bg: '#dcfce7', color: '#166534' },
  REJECT_APPLICATION: { bg: '#fee2e2', color: '#991b1b' },
  CREATE_ROOM: { bg: '#dbeafe', color: '#1e40af' },
  UPDATE_ROOM: { bg: '#fef3c7', color: '#92400e' },
  RECORD_PAYMENT: { bg: '#dcfce7', color: '#166534' },
  VERIFY_PAYMENT: { bg: '#d1fae5', color: '#065f46' },
  REJECT_PAYMENT: { bg: '#fee2e2', color: '#991b1b' },
  POST_ANNOUNCEMENT: { bg: '#ede9fe', color: '#6d28d9' },
  DEACTIVATE_USER: { bg: '#fee2e2', color: '#991b1b' },
  ACTIVATE_USER: { bg: '#dcfce7', color: '#166534' },
  ASSIGN_ROLE: { bg: '#fef3c7', color: '#92400e' },
  RESET_PASSWORD: { bg: '#fef3c7', color: '#92400e' },
  CREATE_APPLICATION: { bg: '#dbeafe', color: '#1e40af' },
  UPDATE_PROFILE: { bg: '#f1f5f9', color: '#475569' },
  SESSION_TIMEOUT: { bg: '#fee2e2', color: '#b91c1c' },
  LOGIN: { bg: '#dcfce7', color: '#15803d' },
  LOGOUT: { bg: '#f1f5f9', color: '#475569' },
  CREATE_BACKUP: { bg: '#eef2ff', color: '#4338ca' },
  RESTORE_DATA: { bg: '#fef3c7', color: '#92400e' },
  UPDATE_PAYMENT_SETTINGS: { bg: '#e0e7ff', color: '#3730a3' },
}

const ROLE_COLORS = {
  Admin: { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  Landlord: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  Boarder: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  Applicant: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
}

export default function AdminAuditLogsSection() {
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'logins'
  const [logs, setLogs] = useState([])
  const [loginEvents, setLoginEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters for All Audit Logs
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  // Filters for Login Activity tab
  const [loginSearch, setLoginSearch] = useState('')
  const [loginRoleFilter, setLoginRoleFilter] = useState('all')
  const [loginEventFilter, setLoginEventFilter] = useState('all') // 'all' | 'LOGIN' | 'LOGOUT' | 'SESSION_TIMEOUT'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch audit logs raw data without PostgREST join syntax to prevent 400 Bad Request
      const { data: auditData, error: auditErr } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (auditErr) {
        console.error('Audit logs fetch error:', auditErr)
        setLogs([])
        return
      }

      const decAudit = (auditData || []).map(l => {
        const d = decryptObject(l, ['details', 'ip_address'])
        if (!d.ip_address) {
          d.ip_address = '127.0.0.1 (Localhost)'
        }
        return d
      })

      // 2. Fetch associated user profile info safely in memory
      const userIds = [...new Set(decAudit.map(l => l.user_id).filter(Boolean))]
      let userMap = {}

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds)

        if (usersData) {
          usersData.forEach(u => {
            userMap[u.id] = u
          })
        }
      }

      // 3. Attach user objects to logs
      const enriched = decAudit.map(log => ({
        ...log,
        users: userMap[log.user_id] || null
      }))

      setLogs(enriched)
    } catch (err) {
      logError('AdminAuditLogsSection.fetchData', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Filtered Audit Logs ──────────────────────────────────────────────────────
  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.users?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.users?.email || '').toLowerCase().includes(search.toLowerCase())
    const matchAction = !filterAction || l.action === filterAction
    const matchFrom = !dateFrom || l.created_at >= new Date(dateFrom).toISOString()
    const matchTo = !dateTo || l.created_at <= new Date(dateTo + 'T23:59:59').toISOString()
    return matchSearch && matchAction && matchFrom && matchTo
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort()

  // ── Unified Login & Session Activities ───────────────────────────────────────
  // Combines audit_logs auth events (LOGIN, LOGOUT, SESSION_TIMEOUT) with login_events device metadata
  const authAuditLogs = logs.filter(l => ['LOGIN', 'LOGOUT', 'SESSION_TIMEOUT'].includes(l.action))

  const filteredLoginLogs = authAuditLogs.filter(item => {
    const roleName = item.users?.roles?.name || (item.description?.includes('Admin') ? 'Admin' : item.description?.includes('Landlord') ? 'Landlord' : item.description?.includes('Boarder') ? 'Boarder' : item.description?.includes('Applicant') ? 'Applicant' : 'User')
    const matchRole = loginRoleFilter === 'all' || roleName === loginRoleFilter
    const matchEvent = loginEventFilter === 'all' || item.action === loginEventFilter
    const matchSearch = !loginSearch ||
      (item.users?.name || '').toLowerCase().includes(loginSearch.toLowerCase()) ||
      (item.users?.email || '').toLowerCase().includes(loginSearch.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(loginSearch.toLowerCase())
    return matchRole && matchEvent && matchSearch
  })

  // Quick stats for Login Activity
  const totalLogins = logs.filter(l => l.action === 'LOGIN').length
  const totalLogouts = logs.filter(l => l.action === 'LOGOUT').length
  const totalTimeouts = logs.filter(l => l.action === 'SESSION_TIMEOUT').length

  const exportCSV = () => {
    const headers = ['ID', 'Action', 'User', 'Email', 'Role', 'Description', 'Target Type', 'Target ID', 'Created At']
    const rows = filtered.map(l => [
      l.id, l.action,
      l.users?.name || '',
      l.users?.email || '',
      l.users?.roles?.name || '',
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.target_type || '', l.target_id || '',
      l.created_at,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportLoginActivityCSV = () => {
    const headers = ['ID', 'Event', 'User Name', 'Email', 'Role', 'Description', 'Timestamp']
    const rows = filteredLoginLogs.map(l => [
      l.id,
      l.action,
      l.users?.name || '',
      l.users?.email || '',
      l.users?.roles?.name || 'User',
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.created_at
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `login_activity_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const timeAgo = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={22} color="#4f46e5" /> System Audit & Login Activity
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            {activeTab === 'all'
              ? `Full non-repudiation audit trail — ${filtered.length} / ${logs.length} entries shown`
              : `User authentication and session monitoring across all roles — ${filteredLoginLogs.length} events`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={activeTab === 'all' ? exportCSV : exportLoginActivityCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Sub Tabs: All Audit Logs vs Login Activity */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: activeTab === 'all' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'all' ? '#fff' : '#475569',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ClipboardList size={16} /> All System Events ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab('logins')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: activeTab === 'logins' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'logins' ? '#fff' : '#475569',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldCheck size={16} /> Login & Session Activities ({authAuditLogs.length})
        </button>
      </div>


      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" placeholder="Search action, user, description..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0) }}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
              <option value="">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }} />
            <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }} />
            {(search || filterAction || dateFrom || dateTo) && (
              <button onClick={() => { setSearch(''); setFilterAction(''); setDateFrom(''); setDateTo(''); setPage(0) }}
                style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={12} /> Clear
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
              Loading audit logs...
            </div>
          ) : (
            <>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      {['Action', 'User', 'Description', 'IP Address', 'Target', 'Time'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((log, i) => {
                      const cfg = ACTION_COLORS[log.action] || { bg: '#f1f5f9', color: '#475569' }
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>{log.action}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {log.users ? (
                              <>
                                <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{log.users.name}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{log.users.email}</div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                  {log.description?.includes(':')
                                    ? log.description.split(':').pop().trim()
                                    : 'System'}
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                                  DB Trigger
                                </div>
                              </>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569', maxWidth: '320px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</div>
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 7px', borderRadius: '5px', fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600 }}>
                              {log.ip_address}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#64748b' }}>
                            {log.target_type && <span>{log.target_type}{log.target_id ? ` #${log.target_id}` : ''}</span>}
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.75rem' }}>{timeAgo(log.created_at)}</td>
                        </tr>
                      )
                    })}
                    {paginated.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No logs match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontWeight: 600, fontSize: '0.8125rem', color: '#475569' }}>← Prev</button>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, fontWeight: 600, fontSize: '0.8125rem', color: '#475569' }}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: LOGIN & SESSION ACTIVITY                                          */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logins' && (
        <>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '0.8125rem' }}>
                <LogIn size={16} /> Total Login Events
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#166534', marginTop: '6px' }}>{totalLogins}</div>
              <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '2px' }}>Recorded across all roles</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 700, fontSize: '0.8125rem' }}>
                <LogOut size={16} /> User Sign-outs
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#334155', marginTop: '6px' }}>{totalLogouts}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Manual sign-out actions</div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '0.8125rem' }}>
                <Clock size={16} /> Session Timeouts
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#991b1b', marginTop: '6px' }}>{totalTimeouts}</div>
              <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>Auto 15m idle terminations</div>
            </div>
          </div>

          {/* Login Activity Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search user, email, or details..."
                value={loginSearch}
                onChange={e => setLoginSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {/* Event Filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Events' },
                { key: 'LOGIN', label: 'Logins' },
                { key: 'LOGOUT', label: 'Sign-outs' },
                { key: 'SESSION_TIMEOUT', label: 'Timeouts' }
              ].map(evt => (
                <button
                  key={evt.key}
                  onClick={() => setLoginEventFilter(evt.key)}
                  style={{
                    padding: '7px 12px', borderRadius: '20px', border: '1.5px solid', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    background: loginEventFilter === evt.key ? '#4f46e5' : '#fff',
                    color: loginEventFilter === evt.key ? '#fff' : '#64748b',
                    borderColor: loginEventFilter === evt.key ? '#4f46e5' : '#e2e8f0',
                    transition: 'all 0.15s'
                  }}
                >
                  {evt.label}
                </button>
              ))}
            </div>

            {/* Role Filter */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'Admin', 'Landlord', 'Boarder', 'Applicant'].map(r => (
                <button
                  key={r}
                  onClick={() => setLoginRoleFilter(r)}
                  style={{
                    padding: '7px 12px', borderRadius: '20px', border: '1.5px solid', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    background: loginRoleFilter === r ? '#0f172a' : '#fff',
                    color: loginRoleFilter === r ? '#fff' : '#64748b',
                    borderColor: loginRoleFilter === r ? '#0f172a' : '#e2e8f0',
                    transition: 'all 0.15s'
                  }}
                >
                  {r === 'all' ? 'All Roles' : r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
              Loading login activities...
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Event Type', 'User', 'Role', 'IP Address', 'Activity Description', 'Time'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLoginLogs.map((log, i) => {
                    const cfg = ACTION_COLORS[log.action] || { bg: '#f1f5f9', color: '#475569' }
                    const roleName = log.users?.roles?.name || (log.description?.includes('Admin') ? 'Admin' : log.description?.includes('Landlord') ? 'Landlord' : log.description?.includes('Boarder') ? 'Boarder' : log.description?.includes('Applicant') ? 'Applicant' : 'User')
                    const roleCfg = ROLE_COLORS[roleName] || ROLE_COLORS.Applicant

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        {/* Event badge */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            background: cfg.bg, color: cfg.color, padding: '4px 10px',
                            borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700
                          }}>
                            {log.action === 'LOGIN' && <LogIn size={12} />}
                            {log.action === 'LOGOUT' && <LogOut size={12} />}
                            {log.action === 'SESSION_TIMEOUT' && <Clock size={12} />}
                            {log.action}
                          </span>
                        </td>

                        {/* User */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {log.users?.name || log.description?.split(':')?.[1]?.split('(')?.[0]?.trim() || 'User'}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                            {log.users?.email || log.description?.match(/\(([^)]+)\)/)?.[1] || '—'}
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                            fontSize: '0.75rem', fontWeight: 700, background: roleCfg.bg,
                            color: roleCfg.color, border: `1px solid ${roleCfg.border}`
                          }}>
                            {roleName}
                          </span>
                        </td>

                        {/* IP Address */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '5px', fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600 }}>
                            {log.ip_address}
                          </span>
                        </td>

                        {/* Description */}
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          <div>{log.description}</div>
                        </td>

                        {/* Time */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.75rem' }}>
                          <div>{new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{timeAgo(log.created_at)}</div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredLoginLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                        No login activity records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
