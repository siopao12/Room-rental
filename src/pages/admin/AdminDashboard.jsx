import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, LayoutDashboard, Users, Lock,
  ClipboardList, Key, Database, LogOut,
  ChevronRight, Menu, X, Shield
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { recordLogoutEvent } from '../../lib/authActivityHelper'

import AdminOverviewSection from './sections/AdminOverviewSection'
import UserManagementSection from './sections/UserManagementSection'
import SecurityMonitorSection from './sections/SecurityMonitorSection'
import AdminAuditLogsSection from './sections/AdminAuditLogsSection'
import RolesAccessSection from './sections/RolesAccessSection'
import DataExportSection from './sections/DataExportSection'

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'security', label: 'Security Monitor', icon: Lock },
  { key: 'audit', label: 'Audit Logs', icon: ClipboardList },
  { key: 'roles', label: 'Roles & Access', icon: Key },
  { key: 'export', label: 'Backup & Recovery', icon: Database },
]

const ACCENT = '#6366f1'  // indigo
const SIDEBAR_BG = 'linear-gradient(180deg, #0f0e2e 0%, #1e1b4b 60%, #312e81 100%)'
const ACTIVE_COLOR = '#a5b4fc'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { navigate('/', { replace: true }); return }

      setCurrentUser(session.user)

      const { data: profile } = await supabase
        .from('users')
        .select('*, roles(*)')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (!profile || profile?.roles?.name !== 'Admin') {
        navigate('/', { replace: true })
        return
      }

      setUserProfile(profile)
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  const handleLogout = async () => {
    await recordLogoutEvent(currentUser, userProfile)
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0e2e 0%, #1e1b4b 100%)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.9 }} />
          <div style={{ fontSize: '1.125rem', fontWeight: 600, opacity: 0.85 }}>Loading Admin Dashboard...</div>
        </div>
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <AdminOverviewSection currentUser={currentUser} userProfile={userProfile} />
      case 'users': return <UserManagementSection currentUser={currentUser} />
      case 'security': return <SecurityMonitorSection currentUser={currentUser} />
      case 'audit': return <AdminAuditLogsSection currentUser={currentUser} />
      case 'roles': return <RolesAccessSection currentUser={currentUser} />
      case 'export': return <DataExportSection currentUser={currentUser} userProfile={userProfile} />
      default: return null
    }
  }

  const activeLabel = NAV_ITEMS.find(n => n.key === activeSection)?.label || 'Admin'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? '260px' : '72px',
        minHeight: '100vh',
        background: SIDEBAR_BG,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'sticky', top: 0,
        overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '72px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
            <Shield size={20} />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#fff', whiteSpace: 'nowrap' }}>RoomEase</div>
              <div style={{ fontSize: '0.6875rem', color: ACTIVE_COLOR, fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>ADMIN CONTROL</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                title={!sidebarOpen ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 12px', marginBottom: '4px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontSize: '0.9rem', fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'rgba(165, 180, 252, 0.15)' : 'transparent',
                  color: isActive ? ACTIVE_COLOR : 'rgba(255,255,255,0.65)',
                  borderLeft: isActive ? `3px solid ${ACTIVE_COLOR}` : '3px solid transparent',
                  transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={19} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User & Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {sidebarOpen && (
            <div style={{ padding: '10px 12px', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile?.name || currentUser?.email?.split('@')[0]}
              </div>
              <div style={{ fontSize: '0.6875rem', color: ACTIVE_COLOR, fontWeight: 600, marginTop: '2px' }}>System Administrator</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              border: 'none', cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: '0.9rem', fontWeight: 600,
              transition: 'all 0.2s', overflow: 'hidden', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '0 28px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem' }}>
              <ShieldCheck size={15} color={ACCENT} />
              <span>Admin</span>
              <ChevronRight size={14} />
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{activeLabel}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '24px', padding: '6px 14px',
              fontSize: '0.8125rem', fontWeight: 600, color: '#1e1b4b',
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.875rem' }}>
                {(userProfile?.name || currentUser?.email || 'A')[0].toUpperCase()}
              </div>
              {userProfile?.name?.split(' ')[0] || currentUser?.email?.split('@')[0]}
              <span style={{ background: '#4f46e5', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 700 }}>Admin</span>
            </div>
          </div>
        </header>

        {/* Section Content */}
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
