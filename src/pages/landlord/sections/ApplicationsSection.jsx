import React, { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, RefreshCw, FileText } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { decryptObject } from '../../../lib/encryptionHelper'
import { createNotification } from '../../../lib/notifyHelper'
import { sanitizeError, logError } from '../../../lib/errorHandler'

export default function ApplicationsSection({ currentUser }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select('*, rooms(*), applicant:users!user_id(*)')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('RLS/fetch error on rental_applications:', error)
      }
      const decrypted = (data || []).map(app => {
        const decApp = decryptObject(app, ['emergency_contact_name', 'emergency_contact_phone', 'message', 'notes'])
        if (decApp.applicant) {
          decApp.applicant = decryptObject(decApp.applicant, ['phone', 'emergency_contact'])
        }
        return decApp
      })
      setApplications(decrypted)
    } catch (err) {
      console.error('Error fetching applications:', err)
    } finally {
      setLoading(false)
    }
  }

  const getLandlordId = async () => {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', currentUser.id)
      .single()
    return data?.id || null
  }

  const handleApprove = async (app) => {
    setProcessingId(app.id)
    try {
      const landlordId = await getLandlordId()
      const { error: appUpdateErr } = await supabase.from('rental_applications').update({
        status: 'Approved'
      }).eq('id', app.id)
      if (appUpdateErr) throw appUpdateErr

      const startDate = new Date(app.move_in_date || Date.now())

      const { data: rentalData, error: rentInsertErr } = await supabase.from('rentals').insert({
        user_id: app.user_id,
        room_id: app.room_id,
        start_date: app.move_in_date || new Date().toISOString().split('T')[0],
        due_day: 5,
        status: 'Active'
      }).select().single()
      if (rentInsertErr) throw rentInsertErr

      // Create first billing cycle for the new boarder
      if (rentalData) {
        const billingMonth = new Date(startDate)
        billingMonth.setDate(1) // always 1st of month
        const dueDate = new Date(billingMonth)
        dueDate.setDate(5) // due on 5th of month

        const { error: billInsertErr } = await supabase.from('bills').insert({
          rental_id: rentalData.id,
          user_id: app.user_id,
          billing_month: billingMonth.toISOString().split('T')[0],
          amount: app.rooms?.monthly_rent || 3500,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'Unpaid'
        })
        if (billInsertErr) console.error('Error inserting initial bill:', billInsertErr)
      }

      await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', app.room_id)
      await supabase.from('users').update({ role_id: 3 }).eq('id', app.user_id)

      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'APPROVE_APPLICATION',
        target_type: 'RENTAL_APPLICATIONS',
        target_id: app.id,
        description: `Landlord approved application #${app.id} for Room ${app.rooms?.room_number || app.room_id} & promoted user to Boarder`
      })

      // Notify the applicant their application was approved
      await createNotification(
        app.user_id,
        '🎉 Application Approved!',
        `Your application for ${app.rooms?.room_number || 'the room'} has been approved. Welcome aboard, Boarder!`,
        'application_approved'
      )

      fetchApplications()
    } catch (err) {
      logError('ApplicationsSection.handleApprove', err)
      alert(sanitizeError(err, 'application'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (app) => {
    setProcessingId(app.id)
    try {
      const landlordId = await getLandlordId()
      const { error: rejectErr } = await supabase.from('rental_applications').update({
        status: 'Rejected'
      }).eq('id', app.id)
      if (rejectErr) throw rejectErr

      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'REJECT_APPLICATION',
        target_type: 'RENTAL_APPLICATIONS',
        target_id: app.id,
        description: `Landlord rejected application #${app.id} for Room ${app.rooms?.room_number || app.room_id}`
      })

      // Notify the applicant their application was rejected
      await createNotification(
        app.user_id,
        '❌ Application Not Approved',
        `Your application for ${app.rooms?.room_number || 'the room'} was not approved at this time. Please contact management for more details.`,
        'application_rejected'
      )

      fetchApplications()
    } catch (err) {
      logError('ApplicationsSection.handleReject', err)
      alert(sanitizeError(err, 'application'))
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = filterStatus === 'all'
    ? applications
    : applications.filter(a => a.status === filterStatus)

  const statusCounts = {
    pending: applications.filter(a => a.status === 'Pending').length,
    approved: applications.filter(a => a.status === 'Approved').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Boarder Applications</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Review and process incoming rental applications
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchApplications}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Pending', count: statusCounts.pending, color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
          { label: 'Approved', count: statusCounts.approved, color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
          { label: 'Rejected', count: statusCounts.rejected, color: '#991b1b', bg: '#fee2e2', border: '#fecaca' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: stat.bg, border: `1px solid ${stat.border}`,
            borderRadius: '12px', padding: '16px 20px',
            cursor: 'pointer',
            outline: filterStatus === stat.label ? `2px solid ${stat.color}` : 'none',
          }} onClick={() => setFilterStatus(filterStatus === stat.label ? 'all' : stat.label)}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>{stat.count}</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: stat.color, opacity: 0.85 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'Pending', 'Approved', 'Rejected'].map(s => (
          <button key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 16px', borderRadius: '20px', border: '1px solid',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              background: filterStatus === s ? '#2d6a4f' : '#fff',
              color: filterStatus === s ? '#fff' : '#64748b',
              borderColor: filterStatus === s ? '#2d6a4f' : '#e2e8f0',
              transition: 'all 0.2s',
            }}>
            {s === 'all' ? `All (${applications.length})` : s}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading applications...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <FileText size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>No Applications Found</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {filterStatus === 'all' ? 'No boarder applications yet.' : `No ${filterStatus.toLowerCase()} applications.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((app) => (
            <div key={app.id} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
              padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              borderLeft: `4px solid ${app.status === 'Approved' ? '#22c55e' : app.status === 'Rejected' ? '#ef4444' : '#f59e0b'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                   <h4 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                     {app.applicant?.name || app.applicant?.email || `User #${app.user_id}`}
                   </h4>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    Room: <strong>{app.rooms?.room_number || `#${app.room_id}`}</strong>
                    {' · '}₱{Number(app.rooms?.monthly_rent || 0).toLocaleString()}/mo
                  </span>
                </div>
                <span style={{
                  padding: '5px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                  background: app.status === 'Approved' ? '#dcfce7' : app.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                  color: app.status === 'Approved' ? '#166534' : app.status === 'Rejected' ? '#991b1b' : '#92400e'
                }}>
                  {app.status}
                </span>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                background: '#f8fafc', padding: '12px 16px', borderRadius: '10px',
                marginBottom: '16px', fontSize: '0.875rem'
              }}>
                <div><strong>Move-in:</strong> {app.move_in_date || 'N/A'}</div>
                <div><strong>Applied:</strong> {new Date(app.created_at).toLocaleDateString()}</div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>Emergency Contact:</strong> {app.emergency_contact_name} — {app.emergency_contact_phone}
                </div>
                {app.message && (
                  <div style={{ gridColumn: 'span 2' }}><strong>Message:</strong> {app.message}</div>
                )}
              </div>

              {app.status === 'Pending' && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline btn-sm"
                    disabled={processingId === app.id}
                    onClick={() => handleReject(app)}
                    style={{ borderColor: '#fca5a5', color: '#991b1b' }}>
                    <XCircle size={15} /> Reject
                  </button>
                  <button className="btn btn-primary btn-sm"
                    disabled={processingId === app.id}
                    onClick={() => handleApprove(app)}>
                    {processingId === app.id
                      ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      : <CheckCircle2 size={15} />}
                    Approve Application
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
