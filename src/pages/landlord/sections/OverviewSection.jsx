import React, { useState, useEffect } from 'react'
import { Home, Users, FileText, DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function OverviewSection({ currentUser }) {
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    totalBoarders: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    totalPayments: 0,
    monthlyRevenue: 0,
    recentApplications: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [roomsRes, boardersRes, appsRes, paymentsRes] = await Promise.all([
        supabase.from('rooms').select('id, status'),
        supabase.from('users').select('id').eq('role_id', 3),
        supabase.from('rental_applications').select('id, status, created_at, rooms(room_number), users:users!user_id(name, email)').order('created_at', { ascending: false }),
        supabase.from('payments').select('amount, created_at'),
      ])

      if (roomsRes.error) console.error('Overview rooms error:', roomsRes.error)
      if (boardersRes.error) console.error('Overview boarders error:', boardersRes.error)
      if (appsRes.error) console.error('Overview apps error:', appsRes.error)
      if (paymentsRes.error) console.error('Overview payments error:', paymentsRes.error)

      const rooms = roomsRes.data || []
      const boarders = boardersRes.data || []
      const apps = appsRes.data || []
      const payments = paymentsRes.data || []

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyRevenue = payments
        .filter(p => new Date(p.created_at) >= monthStart)
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

      setStats({
        totalRooms: rooms.length,
        availableRooms: rooms.filter(r => (r.status || '').toLowerCase() === 'available').length,
        occupiedRooms: rooms.filter(r => (r.status || '').toLowerCase() === 'occupied').length,
        totalBoarders: boarders.length,
        pendingApplications: apps.filter(a => a.status === 'Pending').length,
        approvedApplications: apps.filter(a => a.status === 'Approved').length,
        totalPayments: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        monthlyRevenue,
        recentApplications: apps.slice(0, 5),
      })
    } catch (err) {
      console.error('Error fetching overview stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
        <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
        Loading overview...
      </div>
    )
  }

  const statCards = [
    { label: 'Total Rooms', value: stats.totalRooms, sub: `${stats.availableRooms} available`, icon: Home, color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Active Boarders', value: stats.totalBoarders, sub: `${stats.occupiedRooms} rooms occupied`, icon: Users, color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
    { label: 'Pending Applications', value: stats.pendingApplications, sub: `${stats.approvedApplications} approved`, icon: FileText, color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
    { label: 'Monthly Revenue', value: `₱${stats.monthlyRevenue.toLocaleString()}`, sub: `₱${stats.totalPayments.toLocaleString()} total`, icon: DollarSign, color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  ]

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1b4332 60%, #2d6a4f 100%)',
        borderRadius: '20px',
        padding: '32px 36px',
        marginBottom: '28px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(149,213,178,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 60, width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(149,213,178,0.05)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#95d5b2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Welcome back
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},{' '}
            {(currentUser?.email || 'Landlord').split('@')[0]}! 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem' }}>
            Here's your property management overview for today — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {statCards.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
            padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a' }}>Recent Applications</h3>
          <TrendingUp size={18} color="#2d6a4f" />
        </div>

        {stats.recentApplications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
            <FileText size={32} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '0.875rem' }}>No applications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.recentApplications.map(app => (
              <div key={app.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: '#f8fafc', borderRadius: '10px',
                border: '1px solid #f1f5f9',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                    {app.users?.name || app.users?.email || `Applicant #${app.id}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Room: {app.rooms?.room_number || '—'} · {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                  background: app.status === 'Approved' ? '#dcfce7' : app.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                  color: app.status === 'Approved' ? '#166534' : app.status === 'Rejected' ? '#991b1b' : '#92400e',
                }}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
