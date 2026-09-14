import React from 'react'
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react'

/**
 * SessionTimeoutModal
 * Displays a high-priority warning when the user has been inactive.
 * Includes a live countdown with options to extend session or log out immediately.
 */
export default function SessionTimeoutModal({ isOpen, remainingSeconds, onStayLoggedIn, onLogout }) {
  if (!isOpen) return null

  // Progress percentage (60s down to 0s)
  const percentage = Math.max(0, Math.min(100, (remainingSeconds / 60) * 100))

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '460px',
        width: '100%',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top gradient accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(90deg, #f59e0b, #ef4444, #6366f1)'
        }} />

        {/* Warning Icon with pulse */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'rgba(254, 243, 199, 0.7)',
          border: '1px solid rgba(253, 230, 138, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#d97706',
          boxShadow: '0 8px 16px rgba(245, 158, 11, 0.15)'
        }}>
          <Clock size={32} style={{ animation: 'pulse 1.5s infinite' }} />
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '8px',
          letterSpacing: '-0.02em'
        }}>
          Session Inactivity Warning
        </h3>

        {/* Description */}
        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          marginBottom: '24px'
        }}>
          You have been idle for several minutes. To protect your account and rental records, your session will automatically close.
        </p>

        {/* Countdown Badge */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#94a3b8',
            marginBottom: '6px'
          }}>
            Time Remaining
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: remainingSeconds <= 15 ? '#ef4444' : '#f59e0b',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1
          }}>
            {remainingSeconds}s
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '6px',
            background: '#e2e8f0',
            borderRadius: '999px',
            marginTop: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: remainingSeconds <= 15 ? '#ef4444' : '#f59e0b',
              transition: 'width 1s linear, background-color 0.3s ease'
            }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onStayLoggedIn}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '0.925rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <RefreshCw size={17} /> Stay Logged In
          </button>

          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fef2f2'
              e.currentTarget.style.color = '#ef4444'
              e.currentTarget.style.borderColor = '#fecaca'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#64748b'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            <LogOut size={16} /> Log Out Now
          </button>
        </div>

        {/* Security badge footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '20px',
          color: '#94a3b8',
          fontSize: '0.75rem'
        }}>
          <ShieldAlert size={14} color="#6366f1" />
          <span>RoomEase IAS2 Session Protection</span>
        </div>
      </div>
    </div>
  )
}
