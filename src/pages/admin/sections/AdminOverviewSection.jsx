import React, { useState, useEffect } from 'react'
import { Users, Home, FileText, DollarSign, ShieldCheck, AlertTriangle, Loader2, RefreshCw, TrendingUp, Activity } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function AdminOverviewSection({ userProfile }) {
  const [stats, setStats] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [
        { data: users },
        { data: rooms },
        { data: applications },
        { data: payments },
        { data: logs },
      ] = await Promise.all([
        supabase.from('users').select('id, role_id, is_active, roles(name)'),
        supabase.from('rooms').select('id, status'),
        supabase.from('rental_applications').select('id, status'),
        supabase.from('payments').select('id, amount, status, created_at'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
      ])

      // Map users for recent audit logs safely
      let logsWithUsers = logs || []
      const logUserIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))]
      if (logUserIds.length > 0) {
        const { data: uData } = await supabase.from('users').select('id, name, email').in('id', logUserIds)
        if (uData) {
          const uMap = {}
          uData.forEach(u => { uMap[u.id] = u })
          logsWithUsers = (logs || []).map(l => ({ ...l, users: uMap[l.user_id] }))
        }
      }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthlyRevenue = (payments || [])
        .filter(p => p.status === 'Paid' && p.created_at >= monthStart)
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

      const usersByRole = {}
      ;(users || []).forEach(u => {
        const r = u.roles?.name || 'Unknown'
        usersByRole[r] = (usersByRole[r] || 0) + 1
      })

      setStats({
        totalUsers: (users || []).length,
        activeUsers: (users || []).filter(u => u.is_active !== false).length,
        usersByRole,
        totalRooms: (rooms || []).length,
        availableRooms: (rooms || []).filter(r => (r.status || '').toLowerCase() === 'available').length,
        occupiedRooms: (rooms || []).filter(r => (r.status || '').toLowerCase() === 'occupied').length,
        pendingApplications: (applications || []).filter(a => a.status === 'Pending').length,
        monthlyRevenue,
      })
      setRecentLogs(logsWithUsers)
    } catch (err) {
      console.error('Admin overview error:', err)
    } finally {
      setLoading(false)
    }
  }

  const timeAgo = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
      <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
      Loading system overview...
    </div>
  )

  const statCards = [
    { label: 'Total Users',         value: stats.totalUsers,          sub: `${stats.activeUsers} active`, icon: Users,     color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'Boarders',            value: stats.usersByRole['Boarder'] || 0,   sub: 'Active renters',    icon: Users,     color: '#0891b2', bg: '#cffafe', border: '#a5f3fc' },
    { label: 'Total Rooms',         value: stats.totalRooms,          sub: `${stats.occupiedRooms} occupied`, icon: Home, color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
    { label: 'Pending Applications',value: stats.pendingApplications, sub: 'Awaiting review',           icon: FileText,  color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
    { label: 'Monthly Revenue',     value: `₱${stats.monthlyRevenue.toLocaleString()}`, sub: 'This month', icon: DollarSign, color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
    { label: 'Landlords',           value: stats.usersByRole['Landlord'] || 0, sub: 'Property managers', icon: ShieldCheck, color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>System Overview</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Live snapshot of the entire RoomEase platform
          </p>
        </div>
        <button onClick={fetchStats}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
        <div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '4px' }}>
            Welcome back, {userProfile?.name?.split(' ')[0] || 'Admin'} 👋
          </div>
          <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>
            You have full administrative access to RoomEase. Use your powers responsibly.
          </div>
        </div>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldCheck size={26} />
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {statCards.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: s.color, opacity: 0.75, marginTop: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{s.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={18} color="#4f46e5" />
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Recent System Activity</span>
        </div>
        {recentLogs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No recent activity.</div>
        ) : (
          recentLogs.map((log, i) => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px 20px', borderBottom: i < recentLogs.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={14} color="#64748b" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{log.action}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.description}</div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
                  {log.users?.name || 'System'} · {timeAgo(log.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
