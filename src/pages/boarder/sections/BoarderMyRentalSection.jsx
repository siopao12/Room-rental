import React from 'react'
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react'

export default function BoarderMyRentalSection({ rentalData }) {
  if (!rentalData) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Rental</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Your lease and rental information</p>
        </div>
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: '#f8fafc', borderRadius: '16px',
          border: '1px dashed #e2e8f0'
        }}>
          <AlertCircle size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>No Active Rental</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your rental information will appear here once your application is approved.</p>
        </div>
      </div>
    )
  }

  const isScheduledMoveOut = (rentalData.status === 'Scheduled Move-Out' || rentalData.is_scheduled_move_out) && !!rentalData.scheduled_move_out_date
  const moveOutDateVal = isScheduledMoveOut ? rentalData.scheduled_move_out_date : null
  const isActive = (rentalData.status === 'Active' || isScheduledMoveOut) && !rentalData.status?.toLowerCase().includes('completed')

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const parsed = new Date(dateStr)
    if (isNaN(parsed.getTime())) {
      return dateStr
    }
    return parsed.toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  const rentRate = Number(rentalData.rooms?.monthly_rent || rentalData.rooms?.price || rentalData.monthly_rent || 0)

  const infoRows = [
    { label: 'Rental Status',      value: isScheduledMoveOut ? 'Scheduled Move-Out' : (rentalData.status || 'Active'), icon: <CheckCircle2 size={16} />, highlight: isActive },
    { label: 'Move-in Date',       value: formatDate(rentalData.start_date),     icon: <Calendar size={16} /> },
    { label: 'Rental Start Date',  value: formatDate(rentalData.start_date),     icon: <Calendar size={16} /> },
    { label: 'Next Due Date',      value: formatDate(rentalData.next_due_date),  icon: <Clock size={16} />, urgent: true },
    { label: 'Move-out Date',      value: isScheduledMoveOut ? formatDate(moveOutDateVal) : 'None Scheduled', icon: <Calendar size={16} />, highlight: isScheduledMoveOut },
    { label: 'Monthly Rental Rate', value: `₱${rentRate.toLocaleString()}`, icon: <DollarSign size={16} />, money: true },
  ]

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Rental</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Your lease and rental information</p>
      </div>

      {/* Status Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        background: isScheduledMoveOut ? '#fffbeb' : isActive ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${isScheduledMoveOut ? '#fde68a' : isActive ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: '14px', padding: '18px 24px', marginBottom: '24px'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
          background: isScheduledMoveOut ? '#fef3c7' : isActive ? '#dcfce7' : '#fee2e2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isScheduledMoveOut ? '#b45309' : isActive ? '#166534' : '#991b1b'
        }}>
          <FileText size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isScheduledMoveOut ? '#b45309' : isActive ? '#166534' : '#991b1b', marginBottom: '2px' }}>
            LEASE STATUS
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isScheduledMoveOut ? '#92400e' : isActive ? '#166534' : '#991b1b' }}>
            {isScheduledMoveOut ? `📅 Move-Out Scheduled (${formatDate(moveOutDateVal)})` : isActive ? '✓ Active Lease' : rentalData.status || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
            Room {rentalData.rooms?.room_number} · ₱{rentRate.toLocaleString()}/month
          </div>
        </div>
      </div>

      {/* Rental Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {infoRows.map((row) => (
          <div key={row.label} style={{
            background: '#fff', borderRadius: '14px', padding: '20px 22px',
            border: `1px solid ${row.urgent ? '#fde68a' : row.highlight ? '#bbf7d0' : '#e2e8f0'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.75rem', fontWeight: 600,
              color: row.urgent ? '#92400e' : row.highlight ? '#166534' : '#64748b',
              marginBottom: '8px'
            }}>
              <span style={{ color: row.urgent ? '#f59e0b' : row.highlight ? '#22c55e' : '#94a3b8' }}>
                {row.icon}
              </span>
              {row.label.toUpperCase()}
            </div>
            <div style={{
              fontSize: row.money ? '1.375rem' : '1rem',
              fontWeight: 800,
              color: row.money ? '#4f46e5' : row.highlight ? '#166534' : '#0f172a'
            }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
