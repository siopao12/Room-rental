import React, { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCheck, Info, CheckCircle2, XCircle, Megaphone, Receipt, CreditCard, FileText } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'

const TYPE_CONFIG = {
  application_approved: { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7', label: 'Approved' },
  application_rejected: { icon: XCircle,      color: '#dc2626', bg: '#fee2e2', label: 'Rejected' },
  new_application:      { icon: FileText,     color: '#2563eb', bg: '#dbeafe', label: 'Application' },
  announcement:         { icon: Megaphone,    color: '#d97706', bg: '#fef3c7', label: 'Announcement' },
  new_bill:             { icon: Receipt,      color: '#7c3aed', bg: '#ede9fe', label: 'Bill' },
  payment_submitted:    { icon: CreditCard,   color: '#0891b2', bg: '#cffafe', label: 'Payment' },
  info:                 { icon: Info,         color: '#64748b', bg: '#f1f5f9', label: 'Info' },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell({ userProfile, accentColor = '#2d6a4f' }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(userProfile)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotificationClick = (n) => {
    if (!n.is_read) markAsRead(n.id)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '40px', height: '40px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          background: open ? '#f8fafc' : '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s',
          color: '#475569',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.background = open ? '#f8fafc' : '#fff'}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px',
            minWidth: '18px', height: '18px',
            background: '#ef4444',
            color: '#fff',
            borderRadius: '9px',
            fontSize: '0.6875rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #fff',
            lineHeight: 1,
            animation: 'pulse 2s infinite',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id="notification-dropdown"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: '360px',
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'slideDown 0.18s ease',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 18px 12px',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color={accentColor} />
              <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background: accentColor, color: '#fff',
                  borderRadius: '10px', padding: '2px 8px',
                  fontSize: '0.6875rem', fontWeight: 700,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: accentColor, fontSize: '0.75rem', fontWeight: 600,
                    padding: '4px 8px', borderRadius: '6px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: '4px', borderRadius: '6px',
                  display: 'flex',
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Bell size={32} color="#cbd5e1" style={{ margin: '0 auto 10px', display: 'block' }} />
                <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>No notifications yet</div>
                <div style={{ color: '#cbd5e1', fontSize: '0.8125rem', marginTop: '4px' }}>
                  You're all caught up!
                </div>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
                const Icon = cfg.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: 'flex', gap: '12px',
                      padding: '13px 18px',
                      cursor: 'pointer',
                      background: n.is_read ? '#fff' : '#f8fafc',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.15s',
                      borderLeft: n.is_read ? '3px solid transparent' : `3px solid ${accentColor}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : '#f8fafc'}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: cfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={17} color={cfg.color} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: n.is_read ? 600 : 700,
                        fontSize: '0.8125rem',
                        color: '#0f172a',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {n.title}
                      </div>
                      <div style={{
                        fontSize: '0.75rem', color: '#64748b',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: accentColor, flexShrink: 0, marginTop: '6px',
                      }} />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500,
            }}>
              Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}
