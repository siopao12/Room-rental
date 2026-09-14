import React, { useState, useEffect } from 'react'
import { Key, Users, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

const ROLE_PERMISSIONS = {
  Admin: [
    'Full system access', 'Manage all users & roles', 'View all audit logs',
    'Activate/deactivate accounts', 'Send password reset emails',
    'Export all data', 'Run security scans', 'Access all sections',
  ],
  Landlord: [
    'Manage own room listings', 'Review rental applications',
    'Approve/reject boarders', 'Record & verify payments',
    'Post announcements', 'View own audit log trail', 'Manage payment settings',
  ],
  Boarder: [
    'View assigned room details', 'View own billing & payment history',
    'Submit digital payment proofs', 'View announcements',
    'Update own profile', 'Receive notifications',
  ],
  Applicant: [
    'Browse available rooms on landing page', 'Submit one rental application',
    'View own application status',
  ],
}

const ROLE_COLORS = {
  Admin: { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd', accent: '#7c3aed' },
  Landlord: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', accent: '#2d6a4f' },
  Boarder: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', accent: '#2563eb' },
  Applicant: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', accent: '#d97706' },
}

export default function RolesAccessSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('id, role_id, roles(name), is_active')
    setUsers(data || [])
    setLoading(false)
  }

  const countByRole = (roleName) => users.filter(u => u.roles?.name === roleName).length
  const activeByRole = (roleName) => users.filter(u => u.roles?.name === roleName && u.is_active !== false).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Roles & Access Control</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Role-Based Access Control (RBAC) — permission reference for all user roles
          </p>
        </div>
        <button onClick={fetchUsers} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading roles...
        </div>
      ) : (
        <>
          {/* Role Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
            {Object.entries(ROLE_PERMISSIONS).map(([roleName, perms]) => {
              const cfg = ROLE_COLORS[roleName]
              const total = countByRole(roleName)
              const active = activeByRole(roleName)
              return (
                <div key={roleName} style={{ background: '#fff', border: `1px solid ${cfg.border}`, borderTop: `4px solid ${cfg.accent}`, borderRadius: '14px', padding: '20px 22px' }}>
                  {/* Role header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {roleName === 'Admin' ? <ShieldCheck size={18} color={cfg.color} /> : <Key size={18} color={cfg.color} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{roleName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>role_id: {['Admin', 'Landlord', 'Boarder', 'Applicant'].indexOf(roleName) + 1}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={13} color="#64748b" />
                        <span style={{ fontWeight: 800, fontSize: '1.125rem', color: cfg.color }}>{total}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>{active} active</div>
                    </div>
                  </div>

                  {/* Permissions list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {perms.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8125rem', color: '#374151' }}>
                        <span style={{ color: cfg.accent, fontWeight: 700, lineHeight: '1.4', flexShrink: 0 }}>✓</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
