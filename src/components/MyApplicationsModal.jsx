import React, { useState, useEffect } from 'react'
import { X, ClipboardList, Clock, CheckCircle2, XCircle, Calendar, Home, ArrowRight, RefreshCw, Loader2, Sparkles, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function MyApplicationsModal({ isOpen, onClose, user, userProfile }) {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && user) {
      fetchMyApplications()
    }
  }, [isOpen, user])

  const fetchMyApplications = async () => {
    setLoading(true)
    try {
      // 1. Get the applicant's internal user ID
      let internalUserId = userProfile?.id
      if (!internalUserId && user?.id) {
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle()
        internalUserId = userRow?.id
      }

      if (!internalUserId) {
        setApplications([])
        return
      }

      // 2. Fetch applications submitted by this user
      const { data, error } = await supabase
        .from('rental_applications')
        .select('*, rooms(*)')
        .eq('user_id', internalUserId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err) {
      console.error('Error loading applicant applications:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Check if any application is approved
  const hasApproved = applications.some(a => a.status === 'Approved')
  const approvedApp = applications.find(a => a.status === 'Approved')

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#dcfce7',
            color: '#166534',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 700
          }}>
            <CheckCircle2 size={14} /> Approved
          </span>
        )
      case 'Rejected':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#fee2e2',
            color: '#991b1b',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 700
          }}>
            <XCircle size={14} /> Not Approved
          </span>
        )
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#fef3c7',
            color: '#92400e',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 700
          }}>
            <Clock size={14} /> Under Review
          </span>
        )
    }
  }

  return (
    <div className="modal-overlay active" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingRight: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={22} color="#2d6a4f" /> My Rental Applications
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '2px' }}>
              Track the live approval status of your room applications
            </p>
          </div>
          <button 
            onClick={fetchMyApplications}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#475569', fontSize: '0.8125rem',
              fontWeight: 600, cursor: 'pointer'
            }}
            title="Refresh status"
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>

        {/* Celebratory Approved Banner if any application is Approved */}
        {hasApproved && (
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderRadius: '16px',
            padding: '20px',
            color: '#ffffff',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)',
            border: '1px solid rgba(165, 180, 252, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
              }}>
                <Sparkles size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                  🎉 Your application for {approvedApp?.rooms?.room_number || 'your room'} is Approved!
                </h4>
                <p style={{ color: '#c7d2fe', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '14px' }}>
                  Your account has been upgraded to <strong>Boarder</strong>. You can now access your room details, rental agreement, bills, and announcements.
                </p>
                <button
                  onClick={() => {
                    onClose()
                    navigate('/boarder')
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px', borderRadius: '10px',
                    background: '#22c55e', color: '#ffffff', border: 'none',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#16a34a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#22c55e'}
                >
                  Access Boarder Dashboard <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite', color: '#2d6a4f' }} />
            <p style={{ fontSize: '0.925rem', fontWeight: 600 }}>Loading your applications...</p>
          </div>
        ) : applications.length === 0 ? (
          /* Empty State */
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1.5px dashed #cbd5e1'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: '#eef2ff', color: '#4f46e5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Home size={28} />
            </div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              No Applications Yet
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              You haven't submitted any room rental applications yet. Browse through our available rooms and click "Apply to Rent".
            </p>
            <button
              onClick={() => {
                onClose()
                const section = document.getElementById('rooms')
                if (section) section.scrollIntoView({ behavior: 'smooth' })
              }}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Building2 size={16} /> Browse Available Rooms
            </button>
          </div>
        ) : (
          /* Applications List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {applications.map((app) => {
              const room = app.rooms
              const submittedDate = new Date(app.created_at).toLocaleDateString('en-PH', {
                month: 'short', day: 'numeric', year: 'numeric'
              })
              const moveInDate = app.move_in_date 
                ? new Date(app.move_in_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Not specified'

              return (
                <div 
                  key={app.id} 
                  style={{
                    background: '#ffffff',
                    border: app.status === 'Approved' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      {room?.image_url ? (
                        <img 
                          src={room.image_url} 
                          alt={room.room_number} 
                          style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                        />
                      ) : (
                        <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <Home size={24} />
                        </div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                            {room?.room_number || `Room #${app.room_id}`}
                          </h4>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            {room?.room_type || 'Single'}
                          </span>
                        </div>
                        <p style={{ color: '#2d6a4f', fontSize: '0.875rem', fontWeight: 700, marginTop: '2px' }}>
                          ₱{(room?.monthly_rent || 0).toLocaleString()} / month
                        </p>
                      </div>
                    </div>

                    <div>
                      {getStatusBadge(app.status)}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    fontSize: '0.8125rem'
                  }}>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>SUBMITTED ON</span>
                      <span style={{ color: '#334155', fontWeight: 700 }}>{submittedDate}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>DESIRED MOVE-IN</span>
                      <span style={{ color: '#334155', fontWeight: 700 }}>{moveInDate}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>EMERGENCY CONTACT</span>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{app.emergency_contact_name || '—'}</span>
                    </div>
                  </div>

                  {/* Status explanation / message */}
                  <div style={{ marginTop: '12px', fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {app.status === 'Pending' && (
                      <span>💡 <em>The landlord is reviewing your submission. You will be notified once approved.</em></span>
                    )}
                    {app.status === 'Approved' && (
                      <span style={{ color: '#166534', fontWeight: 600 }}>✅ Approved! Your room has been assigned. You can now access all tenant services.</span>
                    )}
                    {app.status === 'Rejected' && (
                      <span style={{ color: '#991b1b' }}>❌ This application was not approved. You are welcome to explore and apply for other rooms.</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
