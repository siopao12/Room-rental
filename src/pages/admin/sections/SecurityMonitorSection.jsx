import React, { useState, useEffect } from 'react'
import { AlertTriangle, ShieldAlert, Loader2, RefreshCw, UserX, Eye, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

const FLAG_CONFIG = {
  ghost_account:        { label: 'Ghost Account',             severity: 'low',    color: '#92400e', bg: '#fef3c7', border: '#fde68a', icon: Eye },
  multiple_applications:{ label: 'Multiple Pending Apps',     severity: 'medium', color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe', icon: AlertTriangle },
  high_frequency_action:{ label: 'High-Frequency Actions',   severity: 'high',   color: '#991b1b', bg: '#fee2e2', border: '#fecaca', icon: ShieldAlert },
  no_profile:           { label: 'No Profile Linked',        severity: 'medium', color: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd', icon: AlertTriangle },
  inactive_with_login:  { label: 'Inactive Account Activity', severity: 'high',  color: '#991b1b', bg: '#fee2e2', border: '#fecaca', icon: ShieldAlert },
}

export default function SecurityMonitorSection() {
  const [flags, setFlags]     = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => { runScan() }, [])

  const runScan = async () => {
    setLoading(true)
    const found = []
    try {
      const [
        { data: users },
        { data: applications },
        { data: logs },
      ] = await Promise.all([
        supabase.from('users').select('*, roles(name)'),
        supabase.from('rental_applications').select('id, user_id, status'),
        supabase.from('audit_logs').select('user_id, created_at').order('created_at', { ascending: false }).limit(500),
      ])

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const oneHourAgo   = new Date(Date.now() - 3600 * 1000).toISOString()

      // 1. Ghost accounts: Applicant, created >7 days ago, 0 applications
      const applicantIds = new Set((applications || []).map(a => a.user_id))
      ;(users || []).forEach(u => {
        if (u.roles?.name === 'Applicant' && u.created_at < sevenDaysAgo && !applicantIds.has(u.id)) {
          found.push({ type: 'ghost_account', user: u, detail: `Created ${new Date(u.created_at).toLocaleDateString()} — no applications submitted` })
        }
      })

      // 2. Multiple pending applications from same user
      const pendingByUser = {}
      ;(applications || []).filter(a => a.status === 'Pending').forEach(a => {
        pendingByUser[a.user_id] = (pendingByUser[a.user_id] || 0) + 1
      })
      Object.entries(pendingByUser).forEach(([uid, count]) => {
        if (count >= 2) {
          const user = (users || []).find(u => u.id === parseInt(uid))
          if (user) found.push({ type: 'multiple_applications', user, detail: `${count} pending applications simultaneously` })
        }
      })

      // 3. High-frequency actions in last hour
      const recentByUser = {}
      ;(logs || []).filter(l => l.created_at >= oneHourAgo && l.user_id).forEach(l => {
        recentByUser[l.user_id] = (recentByUser[l.user_id] || 0) + 1
      })
      Object.entries(recentByUser).forEach(([uid, count]) => {
        if (count >= 10) {
          const user = (users || []).find(u => u.id === parseInt(uid))
          if (user) found.push({ type: 'high_frequency_action', user, detail: `${count} actions in the last hour` })
        }
      })

      // 4. Inactive accounts that still appear in audit logs recently
      ;(users || []).filter(u => u.is_active === false).forEach(u => {
        const recentLog = (logs || []).find(l => l.user_id === u.id && l.created_at >= sevenDaysAgo)
        if (recentLog) {
          found.push({ type: 'inactive_with_login', user: u, detail: `Account deactivated but activity found ${new Date(recentLog.created_at).toLocaleDateString()}` })
        }
      })

    } catch (err) {
      console.error('Security scan error:', err)
    } finally {
      setFlags(found)
      setLoading(false)
    }
  }

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate account of ${user.name || user.email}?`)) return
    setProcessing(user.id)
    await supabase.from('users').update({ is_active: false }).eq('id', user.id)
    await supabase.from('audit_logs').insert({
      action: 'DEACTIVATE_USER', target_type: 'USERS', target_id: user.id,
      description: `Admin deactivated ${user.email} via Security Monitor`
    })
    setSuccessMsg(`${user.email} deactivated.`)
    setTimeout(() => setSuccessMsg(''), 3000)
    setProcessing(null)
    runScan()
  }

  const highFlags   = flags.filter(f => FLAG_CONFIG[f.type]?.severity === 'high')
  const medFlags    = flags.filter(f => FLAG_CONFIG[f.type]?.severity === 'medium')
  const lowFlags    = flags.filter(f => FLAG_CONFIG[f.type]?.severity === 'low')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Security Monitor</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Automatic scan for suspicious account patterns</p>
        </div>
        <button onClick={runScan} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
          <RefreshCw size={14} /> Re-scan
        </button>
      </div>

      {successMsg && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontWeight: 600, fontSize: '0.875rem' }}>{successMsg}</div>}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Running security scan...
        </div>
      ) : (
        <>
          {/* Summary Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'High Risk', count: highFlags.length, color: '#991b1b', bg: '#fee2e2', border: '#fecaca' },
              { label: 'Medium Risk', count: medFlags.length, color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe' },
              { label: 'Low Risk', count: lowFlags.length, color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: s.color, opacity: 0.8 }}>{s.label} Flag{s.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>

          {flags.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#f0fdf4' }}>
              <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#166534' }}>All Clear!</div>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>No suspicious activity detected in the last scan.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...highFlags, ...medFlags, ...lowFlags].map((flag, i) => {
                const cfg  = FLAG_CONFIG[flag.type]
                const Icon = cfg.icon
                return (
                  <div key={i} style={{ background: '#fff', border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.color}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>{cfg.label}</span>
                        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '1px 8px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>{cfg.severity}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#374151' }}>{flag.user?.name || flag.user?.email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{flag.detail}</div>
                    </div>
                    <button
                      onClick={() => handleDeactivate(flag.user)}
                      disabled={processing === flag.user?.id || flag.user?.roles?.name === 'Admin'}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: cfg.severity === 'high' ? '#dc2626' : '#e2e8f0', color: cfg.severity === 'high' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0, opacity: processing === flag.user?.id ? 0.6 : 1 }}>
                      {processing === flag.user?.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserX size={13} />}
                      Deactivate
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
