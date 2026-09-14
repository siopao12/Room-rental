import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOff, Home, ArrowLeft } from 'lucide-react'

/**
 * NotFoundPage
 * Used for:
 *  - Actual 404s (unknown routes via catch-all)
 *  - 401 Unauthorized  (not logged in, tried a protected route)
 *  - 403 Forbidden     (wrong role — intentionally shown as 404 for security)
 *
 * Props:
 *  type: 'not-found' | 'unauthorized' | 'forbidden'  (default: 'not-found')
 */
export default function NotFoundPage({ type = 'not-found' }) {
  const navigate = useNavigate()

  const config = {
    'not-found': {
      code:    '404',
      title:   'Page Not Found',
      message: "The page you're looking for doesn't exist or has been moved.",
      icon:    null,
    },
    'unauthorized': {
      code:    '404',
      title:   'Page Not Found',
      message: "The page you're looking for doesn't exist or has been moved.",
      icon:    null,
    },
    'forbidden': {
      code:    '404',
      title:   'Page Not Found',
      message: "The page you're looking for doesn't exist or has been moved.",
      icon:    null,
    },
  }

  const { code, title, message } = config[type] || config['not-found']

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', 'Outfit', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '10%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '56px 48px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Shield icon */}
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3))',
          border: '1px solid rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 8px 24px rgba(124,58,237,0.2)',
        }}>
          <ShieldOff size={36} color="#a5b4fc" />
        </div>

        {/* 404 code */}
        <div style={{
          fontSize: '7rem',
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #a5b4fc, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-4px',
        }}>
          {code}
        </div>

        {/* Divider line */}
        <div style={{
          width: '60px', height: '3px',
          background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
          borderRadius: '2px',
          margin: '0 auto 24px',
        }} />

        {/* Title */}
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: '#f1f5f9',
          marginBottom: '12px',
          letterSpacing: '-0.3px',
        }}>
          {title}
        </h1>

        {/* Message */}
        <p style={{
          color: '#94a3b8',
          fontSize: '0.95rem',
          lineHeight: 1.7,
          marginBottom: '36px',
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            <ArrowLeft size={16} /> Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.4)' }}
          >
            <Home size={16} /> Return to Home
          </button>
        </div>

        {/* Footer note */}
        <p style={{
          marginTop: '32px',
          color: '#475569',
          fontSize: '0.78rem',
        }}>
          RoomEase · IAS2 Secure System
        </p>
      </div>
    </div>
  )
}
