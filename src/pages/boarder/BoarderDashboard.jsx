import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, LayoutDashboard, FileText, Home,
  DollarSign, Megaphone, User, LogOut,
  ChevronRight, Menu, X, CreditCard, Receipt
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { recordLogoutEvent } from '../../lib/authActivityHelper'

import BoarderOverviewSection from './sections/BoarderOverviewSection'
import BoarderMyRoomSection from './sections/BoarderMyRoomSection'
import BoarderMyRentalSection from './sections/BoarderMyRentalSection'
import BoarderMyBillsSection from './sections/BoarderMyBillsSection'
import BoarderPaymentHistorySection from './sections/BoarderPaymentHistorySection'
import BoarderAnnouncementsSection from './sections/BoarderAnnouncementsSection'
import BoarderProfileSection from './sections/BoarderProfileSection'
import NotificationBell from '../../components/NotificationBell'

const NAV_ITEMS = [
  { key: 'overview',         label: 'Overview',         icon: LayoutDashboard },
  { key: 'my_room',          label: 'My Room',           icon: Home            },
  { key: 'my_rental',        label: 'My Rental',         icon: FileText        },
  { key: 'my_bills',         label: 'My Bills',          icon: Receipt         },
  { key: 'payment_history',  label: 'Payment History',   icon: CreditCard      },
  { key: 'announcements',    label: 'Announcements',     icon: Megaphone       },
  { key: 'profile',          label: 'My Profile',        icon: User            },
]

export default function BoarderDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [rentalData, setRentalData] = useState(null) // shared rental context
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
      if (roleName !== 'Boarder') {
        navigate('/', { replace: true })
        return
      }

      setUserProfile(profile)

      // Fetch the boarder's active or scheduled move-out rental for shared context
      const { data: rental } = await supabase
        .from('rentals')
        .select('*, rooms(*)')
        .eq('user_id', profile.id)
        .neq('status', 'Completed')
        .neq('status', 'Terminated')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (rental) {
        // Fetch latest move-out audit log to check if move-out is active or cancelled
        const { data: latestMoveOut } = await supabase
          .from('audit_logs')
          .select('action, description, created_at')
          .eq('target_id', rental.id)
          .in('action', ['SCHEDULE_MOVEOUT', 'CANCEL_MOVEOUT'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestMoveOut && latestMoveOut.action === 'SCHEDULE_MOVEOUT') {
          const match = (latestMoveOut.description || '').match(/\b\d{4}-\d{2}-\d{2}\b/)
          if (match) {
            rental.scheduled_move_out_date = match[0]
            rental.is_scheduled_move_out = true
          } else {
            rental.scheduled_move_out_date = null
            rental.is_scheduled_move_out = false
          }
        } else {
          rental.scheduled_move_out_date = null
          rental.is_scheduled_move_out = false
        }
      }

      setRentalData(rental || null)
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
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.9 }} />
          <div style={{ fontSize: '1.125rem', fontWeight: 600, opacity: 0.85 }}>Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  const renderSection = () => {
    const sectionProps = { currentUser, userProfile, rentalData }
    switch (activeSection) {
      case 'overview':
        return <BoarderOverviewSection {...sectionProps} onNavigate={setActiveSection} />
      case 'my_room':
        return <BoarderMyRoomSection {...sectionProps} />
      case 'my_rental':
        return <BoarderMyRentalSection {...sectionProps} />
      case 'my_bills':
        return <BoarderMyBillsSection {...sectionProps} />
      case 'payment_history':
        return <BoarderPaymentHistorySection {...sectionProps} />
      case 'announcements':
        return <BoarderAnnouncementsSection {...sectionProps} />
      case 'profile':
        return <BoarderProfileSection {...sectionProps} />
      default:
        return null
    }
  }

  const activeLabel = NAV_ITEMS.find(n => n.key === activeSection)?.label || 'Dashboard'
  const displayName = userProfile?.name?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Boarder'


  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: '#f1f5f9',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? '260px' : '72px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}>

        {/* Brand */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px',
          minHeight: '72px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
          }}>
            <Building2 size={20} />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#fff', whiteSpace: 'nowrap' }}>RoomEase</div>
              <div style={{ fontSize: '0.6875rem', color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>BOARDER PORTAL</div>
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
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 12px', marginBottom: '4px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'rgba(165, 180, 252, 0.15)' : 'transparent',
                  color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.65)',
                  borderLeft: isActive ? '3px solid #a5b4fc' : '3px solid transparent',
                  transition: 'all 0.2s',
                  overflow: 'hidden', whiteSpace: 'nowrap',
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
              <div style={{ fontSize: '0.6875rem', color: '#a5b4fc', fontWeight: 600, marginTop: '2px' }}>Boarder</div>
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
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '8px', display: 'flex' }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem' }}>
              <span>Boarder Dashboard</span>
              <ChevronRight size={14} />
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{activeLabel}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotificationBell userProfile={userProfile} accentColor="#4f46e5" />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '24px', padding: '6px 14px',
              fontSize: '0.8125rem', fontWeight: 600, color: '#1e1b4b'
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.875rem'
              }}>
                {displayName[0].toUpperCase()}
              </div>
              {displayName}
              <span style={{ background: '#1e1b4b', color: '#a5b4fc', padding: '2px 8px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 700 }}>
                Boarder
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
