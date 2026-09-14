import React from 'react'
import { ShieldCheck, LogIn, Lock } from 'lucide-react'

/**
 * SessionExpiredModal
 * Appears when the user's session was cleanly terminated due to idle expiration.
 */
export default function SessionExpiredModal({ isOpen, onClose, onLoginClick }) {
  if (!isOpen) return null

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
        maxWidth: '440px',
        width: '100%',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Top accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed)'
        }} />

        {/* Lock Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'rgba(238, 242, 255, 0.9)',
          border: '1px solid #c7d2fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#4f46e5',
          boxShadow: '0 8px 16px rgba(79, 70, 229, 0.15)'
        }}>
          <Lock size={30} />
        </div>

        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '8px'
        }}>
          Session Expired
        </h3>

        <p style={{
          color: '#64748b',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          marginBottom: '28px'
        }}>
          Your session timed out due to 15 minutes of inactivity. For security reasons, you have been safely logged out.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => {
              onClose()
              if (onLoginClick) onLoginClick()
            }}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
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
          >
            <LogIn size={17} /> Log In Again
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Continue as Guest
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '20px',
          color: '#94a3b8',
          fontSize: '0.75rem'
        }}>
          <ShieldCheck size={14} color="#16a34a" />
          <span>IAS2 Session Guard Active</span>
        </div>
      </div>
    </div>
  )
}
