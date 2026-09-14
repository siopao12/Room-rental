import React, { useState, useEffect } from 'react'
import { Home, LogIn, LogOut, User, Menu, X, Building2, ClipboardList, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { recordLogoutEvent } from '../lib/authActivityHelper'

export default function Navbar({ onOpenAuth, onOpenApplications, user, userProfile, setUser }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await recordLogoutEvent(user, userProfile)
    await supabase.auth.signOut()
    setUser(null)
  }

  const roleName = userProfile?.roles?.name || 'Applicant'

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <a href="#" className="logo">
          <div className="logo-mark">
            <Building2 size={22} />
          </div>
          <span>RoomEase</span>
        </a>

        <nav className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <ul className="nav-links">
            <li><a href="#home" className="nav-link active" onClick={() => setMobileMenuOpen(false)}>Home</a></li>
            <li><a href="#rooms" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Available Rooms</a></li>
            <li><a href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>System Features</a></li>
            <li><a href="#contact" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Contact</a></li>
          </ul>
        </nav>

        <div className="nav-actions">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Applicant Button → View My Applications modal */}
              {roleName === 'Applicant' && (
                <button 
                  onClick={onOpenApplications}
                  className="btn btn-outline btn-sm" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ClipboardList size={15} /> My Applications
                </button>
              )}

              {/* Boarder Button → Boarder Portal */}
              {roleName === 'Boarder' && (
                <Link 
                  to="/boarder" 
                  className="btn btn-sm" 
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '6px', 
                    background: '#166534', color: '#fff', border: 'none', fontWeight: 700 
                  }}
                >
                  <LayoutDashboard size={15} /> Boarder Portal
                </Link>
              )}

              {/* Landlord Button → Landlord Dashboard */}
              {roleName === 'Landlord' && (
                <Link 
                  to="/landlord" 
                  className="btn btn-primary btn-sm" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <LayoutDashboard size={15} /> Landlord Dashboard
                </Link>
              )}

              {/* Admin Button → Admin Dashboard */}
              {roleName === 'Admin' && (
                <Link 
                  to="/admin" 
                  className="btn btn-sm" 
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700
                  }}
                >
                  <LayoutDashboard size={15} /> Admin Dashboard
                </Link>
              )}

              <div className="user-badge" title={`Role: ${roleName}`}>
                <User size={15} />
                <span>{userProfile?.name?.split(' ')[0] || user.email.split('@')[0]}</span>
                <span style={{ 
                  fontSize: '0.6875rem', 
                  background: roleName === 'Boarder' ? '#166534' : roleName === 'Landlord' ? '#2d6a4f' : roleName === 'Admin' ? '#4f46e5' : '#475569', 
                  color: '#fff', 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  marginLeft: '4px',
                  fontWeight: 700
                }}>
                  {roleName}
                </span>
              </div>

              <button className="btn btn-outline btn-sm" onClick={handleLogout} title="Sign Out">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
              <LogIn size={16} />
              Login
            </button>
          )}

          <button 
            className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  )
}
