import React from 'react'
import { ShieldAlert, Mail, Phone, X } from 'lucide-react'

/**
 * AccountDeactivatedModal
 * Displays a clear, user-friendly security modal when an account is deactivated by an Admin.
 */
export default function AccountDeactivatedModal({ isOpen, onClose }) {
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
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '480px',
        width: '100%',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Red Security Accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #ef4444, #dc2626)'
        }} />

        {/* Shield Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#fee2e2',
          border: '1.5px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#dc2626',
          boxShadow: '0 8px 16px rgba(220, 38, 38, 0.15)'
        }}>
          <ShieldAlert size={32} />
        </div>

        <h3 style={{
          fontSize: '1.35rem',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '8px'
        }}>
          Account Deactivated
        </h3>

        <p style={{
          color: '#475569',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          marginBottom: '20px'
        }}>
          Your account has been deactivated by a System Administrator due to security or policy flags (e.g., submitting multiple concurrent room applications or high-frequency automated requests).
        </p>

        {/* Support Box */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left',
          fontSize: '0.8125rem',
          color: '#334155'
        }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Need help or believe this is an error?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Mail size={15} color="#4f46e5" />
            <span>Email: <strong>roomeaserentalservice@gmail.com</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={15} color="#059669" />
            <span>Support: <strong>+63 (02) 8123-4567</strong></span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          Understand & Close
        </button>
      </div>
    </div>
  )
}
