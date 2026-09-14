import React, { useState, useEffect } from 'react'
import { Users, Search, Loader2, RefreshCw, ChevronDown, ChevronUp, Mail, ShieldAlert, UserCheck, UserX, Key } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { sanitizeError, logError } from '../../../lib/errorHandler'

const ROLE_COLORS = {
  Admin: { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  Landlord: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  Boarder: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  Applicant: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
}

export default function UserManagementSection() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [processing, setProcessing] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: usersData }, { data: rolesData }] = await Promise.all([
        supabase.from('users').select('*, roles(id, name)').order('created_at', { ascending: false }),
        supabase.from('roles').select('*').order('id'),
      ])
      setUsers(usersData || [])
      setRoles(rolesData || [])
    } catch (err) {
      logError('UserManagementSection.fetchData', err)
    } finally {
      setLoading(false)
    }
  }

  const flash = (setter, msg, ms = 3000) => { setter(msg); setTimeout(() => setter(''), ms) }

  const handleToggleActive = async (user) => {
    setProcessing(user.id)
    const newVal = !(user.is_active !== false)
    const { error } = await supabase.from('users').update({ is_active: newVal }).eq('id', user.id)
    if (error) {
      logError('UserManagementSection.handleToggleActive', error)
      flash(setErrorMsg, sanitizeError(error, 'default'))
      setProcessing(null)
      return
    }
    await supabase.from('audit_logs').insert({
      action: newVal ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      target_type: 'USERS', target_id: user.id,
      description: `Admin ${newVal ? 'activated' : 'deactivated'} account of ${user.name || user.email}`
    })
    flash(setSuccessMsg, `Account ${newVal ? 'activated' : 'deactivated'} successfully.`)
    setProcessing(null)
    fetchData()
  }

  const handleChangeRole = async (user, newRoleId) => {
    setProcessing(user.id + '-role')
    const newRole = roles.find(r => r.id === parseInt(newRoleId))
    const { error } = await supabase.from('users').update({ role_id: parseInt(newRoleId) }).eq('id', user.id)
    if (error) {
      logError('UserManagementSection.handleChangeRole', error)
      flash(setErrorMsg, sanitizeError(error, 'default'))
      setProcessing(null)
      return
    }
    await supabase.from('audit_logs').insert({
      action: 'ASSIGN_ROLE',
      target_type: 'USERS', target_id: user.id,
      description: `Admin changed role of ${user.name || user.email} to ${newRole?.name}`
    })
    flash(setSuccessMsg, `Role changed to ${newRole?.name}.`)
    setProcessing(null)
    fetchData()
  }

  const handlePasswordReset = async (user) => {
    if (!window.confirm(`Send a password reset email to ${user.email}?`)) return
    setProcessing(user.id + '-pw')
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/`
    })
    if (error) {
      logError('UserManagementSection.handlePasswordReset', error)
      flash(setErrorMsg, sanitizeError(error, 'auth'))
      setProcessing(null)
      return
    }
    await supabase.from('audit_logs').insert({
      action: 'RESET_PASSWORD',
      target_type: 'USERS', target_id: user.id,
      description: `Admin triggered password reset email for ${user.email}`
    })
    flash(setSuccessMsg, `Password reset email sent to ${user.email}.`)
    setProcessing(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = search === '' ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.roles?.name === filterRole
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && u.is_active !== false) ||
      (filterStatus === 'inactive' && u.is_active === false)
    return matchSearch && matchRole && matchStatus
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>User Management</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            {users.length} total accounts · {users.filter(u => u.is_active !== false).length} active
          </p>
        </div>
        <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {successMsg && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontWeight: 600, fontSize: '0.875rem' }}>{successMsg}</div>}
      {errorMsg && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontWeight: 600, fontSize: '0.875rem' }}>{errorMsg}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        {/* Role filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'Admin', 'Landlord', 'Boarder', 'Applicant'].map(r => (
            <button key={r} onClick={() => setFilterRole(r)} style={{
              padding: '7px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              background: filterRole === r ? '#4f46e5' : '#fff',
              color: filterRole === r ? '#fff' : '#64748b',
              borderColor: filterRole === r ? '#4f46e5' : '#e2e8f0',
              transition: 'all 0.15s',
            }}>{r === 'all' ? 'All Roles' : r}</button>
          ))}
        </div>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)} style={{
              padding: '7px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              background: filterStatus === val ? '#0f172a' : '#fff',
              color: filterStatus === val ? '#fff' : '#64748b',
              borderColor: filterStatus === val ? '#0f172a' : '#e2e8f0',
              transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading users...
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['', 'Name / Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const roleCfg = ROLE_COLORS[user.roles?.name] || ROLE_COLORS.Applicant
                const isActive = user.is_active !== false
                const isExpanded = expandedId === user.id
                return (
                  <React.Fragment key={user.id}>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fff', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      {/* Expand */}
                      <td style={{ padding: '12px 8px 12px 14px', width: '32px' }}>
                        <button onClick={() => setExpandedId(isExpanded ? null : user.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '2px' }}>
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </td>
                      {/* Name */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{user.name || '—'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>{user.email}</div>
                      </td>
                      {/* Role */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: roleCfg.bg, color: roleCfg.color, border: `1px solid ${roleCfg.border}` }}>
                          {user.roles?.name || 'Unknown'}
                        </span>
                      </td>
                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#991b1b' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* Joined */}
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={processing === user.id || user.roles?.name === 'Admin'}
                            title={user.roles?.name === 'Admin' ? "Cannot deactivate an Admin" : isActive ? 'Deactivate' : 'Activate'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: '1.5px solid', cursor: user.roles?.name === 'Admin' ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap',
                              background: isActive ? '#fee2e2' : '#dcfce7', color: isActive ? '#991b1b' : '#166534', borderColor: isActive ? '#fecaca' : '#bbf7d0',
                              opacity: user.roles?.name === 'Admin' ? 0.4 : 1,
                            }}>
                            {processing === user.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {/* Password reset */}
                          <button
                            onClick={() => handlePasswordReset(user)}
                            disabled={!!processing}
                            title="Send password reset email"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                            {processing === user.id + '-pw' ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={11} />} Reset PW
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded: role changer */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: '0', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                          <div style={{ padding: '14px 20px 16px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Role Changer */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Key size={14} color="#4f46e5" />
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>Change Role:</span>
                              <select
                                value={user.role_id || ''}
                                onChange={e => handleChangeRole(user, e.target.value)}
                                disabled={processing === user.id + '-role' || user.roles?.name === 'Admin'}
                                title={user.roles?.name === 'Admin' ? 'Admin role cannot be changed here' : 'Change role'}
                                style={{ padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', fontFamily: 'inherit', cursor: user.roles?.name === 'Admin' ? 'not-allowed' : 'pointer', background: user.roles?.name === 'Admin' ? '#f8fafc' : '#fff', opacity: user.roles?.name === 'Admin' ? 0.5 : 1 }}
                              >
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                              </select>
                              {processing === user.id + '-role' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />}
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                              <span style={{ fontWeight: 700 }}>User ID:</span> {user.id} &nbsp;·&nbsp;
                              <span style={{ fontWeight: 700 }}>Auth ID:</span> {user.auth_id?.slice(0, 16)}...
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                              <ShieldAlert size={14} color={isActive ? '#166534' : '#dc2626'} />
                              <span style={{ color: isActive ? '#166534' : '#dc2626', fontWeight: 700 }}>
                                Account {isActive ? 'Active — can log in' : 'Deactivated — login blocked by app'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No users found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
