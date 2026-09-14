import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, LayoutDashboard, FileText, Home, Users,
  DollarSign, Megaphone, User, LogOut,
  ChevronRight, Menu, X, TrendingUp, Bell
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { recordLogoutEvent } from '../../lib/authActivityHelper'

import ApplicationsSection from './sections/ApplicationsSection'
import RoomsSection from './sections/RoomsSection'
import BoardersSection from './sections/BoardersSection'
import PaymentsSection from './sections/PaymentsSection'
import AnnouncementsSection from './sections/AnnouncementsSection'
import ProfileSection from './sections/ProfileSection'
import OverviewSection from './sections/OverviewSection'
import NotificationBell from '../../components/NotificationBell'

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'applications', label: 'Applications', icon: FileText },
  { key: 'rooms', label: 'Rooms', icon: Home },
  { key: 'boarders', label: 'Boarders', icon: Users },
  { key: 'payments', label: 'Payments', icon: DollarSign },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'profile', label: 'My Profile', icon: User },
]

export default function LandlordDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/', { replace: true })
        return
      }

      setCurrentUser(session.user)

      const { data: profile } = await supabase
        .from('users')
        .select('*, roles(*)')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (!profile) {
        navigate('/', { replace: true })
        return
      }

      const roleName = profile?.roles?.name || ''
      if (roleName === 'Admin') {
        navigate('/admin', { replace: true })
        return
      }
      if (roleName !== 'Landlord') {
        // Not a landlord — redirect back to landing
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
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1b4332 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.9 }} />
          <div style={{ fontSize: '1.125rem', fontWeight: 600, opacity: 0.85 }}>Loading Dashboard...</div>
        </div>
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':     return <OverviewSection currentUser={currentUser} />
      case 'applications': return <ApplicationsSection currentUser={currentUser} />
      case 'rooms':        return <RoomsSection />
      case 'boarders':     return <BoardersSection />
      case 'payments':     return <PaymentsSection currentUser={currentUser} />
      case 'announcements':return <AnnouncementsSection currentUser={currentUser} />
      case 'profile':      return <ProfileSection currentUser={currentUser} />
      default:             return null
    }
  }

  const activeLabel = NAV_ITEMS.find(n => n.key === activeSection)?.label || 'Dashboard'


  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? '260px' : '72px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1b4332 100%)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}>
        {/* Sidebar Brand */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: '72px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(45, 106, 79, 0.4)'
          }}>
            <Building2 size={20} />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#fff', whiteSpace: 'nowrap' }}>RoomEase</div>
              <div style={{ fontSize: '0.6875rem', color: '#95d5b2', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>LANDLORD PORTAL</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                title={!sidebarOpen ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'rgba(149, 213, 178, 0.15)' : 'transparent',
                  color: isActive ? '#95d5b2' : 'rgba(255,255,255,0.65)',
                  borderLeft: isActive ? '3px solid #95d5b2' : '3px solid transparent',
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
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
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {sidebarOpen && (
            <div style={{ padding: '10px 12px', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile?.name || currentUser?.email?.split('@')[0]}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#95d5b2', fontWeight: 600, marginTop: '2px' }}>
                {userProfile?.roles?.name || 'Landlord'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              border: 'none', cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#fca5a5',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: '0.9rem', fontWeight: 600,
              transition: 'all 0.2s',
              overflow: 'hidden', whiteSpace: 'nowrap',
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
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 28px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '8px', display: 'flex' }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem' }}>
              <span>Dashboard</span>
              <ChevronRight size={14} />
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{activeLabel}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotificationBell userProfile={userProfile} accentColor="#2d6a4f" />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '24px', padding: '6px 14px',
              fontSize: '0.8125rem', fontWeight: 600, color: '#1b4332'
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #2d6a4f, #40916c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.875rem' }}>
                {(userProfile?.name || currentUser?.email || 'L')[0].toUpperCase()}
              </div>
              {userProfile?.name?.split(' ')[0] || currentUser?.email?.split('@')[0]}
              <span style={{ background: '#1b4332', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 700 }}>
                {userProfile?.roles?.name || 'Landlord'}
              </span>
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
