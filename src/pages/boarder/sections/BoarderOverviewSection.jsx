import React, { useState, useEffect } from 'react'
import { Home, Receipt, CreditCard, TrendingUp, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function BoarderOverviewSection({ userProfile, rentalData, onNavigate }) {
  const [currentBill, setCurrentBill] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (rentalData?.id) fetchCurrentBill()
    else setLoading(false)
  }, [rentalData])

  const fetchCurrentBill = async () => {
    try {
      let { data } = await supabase
        .from('bills')
        .select('*')
        .eq('rental_id', rentalData.id)
        .in('status', ['Unpaid', 'Partial'])
        .order('billing_month', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!data) {
        const { data: latest } = await supabase
          .from('bills')
          .select('*')
          .eq('rental_id', rentalData.id)
          .order('billing_month', { ascending: false })
          .limit(1)
          .maybeSingle()
        data = latest
      }

      setCurrentBill(data || null)
    } catch (err) {
      console.error('Error fetching current bill:', err)
    } finally {
      setLoading(false)
    }
  }

  const displayName = userProfile?.name?.split(' ')[0] || 'Boarder'
  const room = rentalData?.rooms

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid':    return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' }
      case 'Partial': return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
      default:        return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
    }
  }

  const formatBillingMonth = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  }

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        borderRadius: '20px', padding: '32px 36px', marginBottom: '28px',
        color: '#fff', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'rgba(165, 180, 252, 0.08)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '80px',
          width: '160px', height: '160px', borderRadius: '50%',
          background: 'rgba(79, 70, 229, 0.12)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#a5b4fc', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>Welcome back</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Hello, {displayName}! 👋</h1>
          {room ? (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem' }}>
              You're in <strong style={{ color: '#a5b4fc' }}>Room {room.room_number}</strong> · ₱{Number(rentalData.rooms?.monthly_rent || rentalData.rooms?.price || rentalData.monthly_rent || 0).toLocaleString()}/month
            </p>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem' }}>No active rental found.</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {rentalData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            {
              label: 'Monthly Rent',
              value: `₱${Number(rentalData.rooms?.monthly_rent || rentalData.rooms?.price || rentalData.monthly_rent || 0).toLocaleString()}`,
              icon: <Home size={20} />,
              color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe'
            },
            {
              label: 'Rental Status',
              value: rentalData.status || 'Active',
              icon: <CheckCircle2 size={20} />,
              color: '#166534', bg: '#dcfce7', border: '#bbf7d0'
            },
            {
              label: 'Next Due Date',
              value: rentalData.next_due_date || '—',
              icon: <Clock size={20} />,
              color: '#92400e', bg: '#fef3c7', border: '#fde68a'
            },
          ].map(stat => (
            <div key={stat.label} style={{
              background: stat.bg, border: `1px solid ${stat.border}`,
              borderRadius: '16px', padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: '16px'
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stat.color, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: stat.color, fontWeight: 600, opacity: 0.8 }}>{stat.label}</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Bill Card */}
      <div style={{ display: 'grid', gridTemplateColumns: rentalData ? '1fr 1fr' : '1fr', gap: '20px' }}>

        <div style={{
          background: '#fff', borderRadius: '16px', padding: '24px',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5'
            }}>
              <Receipt size={18} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Current Bill</h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
              <Loader2 size={20} style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} />
              Loading...
            </div>
          ) : currentBill ? (
            <div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600, marginBottom: '16px' }}>
                {formatBillingMonth(currentBill.billing_month)}
              </div>
              {(() => {
                const billAmt = Number(currentBill.amount || 0)
                const isPaid = currentBill.status === 'Paid'
                const amountPaid = isPaid ? billAmt : 0
                const balance = isPaid ? 0 : billAmt

                return [
                  { label: 'Monthly Rent',  value: `₱${billAmt.toLocaleString()}` },
                  { label: 'Due Date',      value: currentBill.due_date || '—' },
                  { label: 'Amount Paid',   value: `₱${amountPaid.toLocaleString()}` },
                  { label: 'Balance',       value: `₱${balance.toLocaleString()}` },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: '#64748b' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.value}</span>
                  </div>
                ))
              })()}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                {(() => {
                  const s = getStatusStyle(currentBill.status)
                  return (
                    <span style={{
                      display: 'inline-block',
                      background: s.bg, color: s.color,
                      border: `1px solid ${s.border}`,
                      padding: '6px 20px', borderRadius: '20px',
                      fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.05em'
                    }}>
                      {(currentBill.status || 'UNPAID').toUpperCase()}
                    </span>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: '#22c55e' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>All bills are paid!</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>No outstanding balance.</div>
            </div>
          )}

          <button
            onClick={() => onNavigate('my_bills')}
            style={{
              width: '100%', marginTop: '16px', padding: '10px',
              background: '#eef2ff', color: '#4f46e5', border: 'none',
              borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
            onMouseLeave={e => e.currentTarget.style.background = '#eef2ff'}
          >
            View All Bills →
          </button>
        </div>

        {/* Quick Navigation */}
        {rentalData && (
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px',
            border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534'
              }}>
                <TrendingUp size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Quick Access</h3>
            </div>
            {[
              { key: 'my_room',         label: 'My Room',           desc: 'View room details & amenities',    color: '#4f46e5', bg: '#eef2ff' },
              { key: 'my_rental',       label: 'My Rental',         desc: 'Lease dates & rental info',        color: '#0369a1', bg: '#f0f9ff' },
              { key: 'payment_history', label: 'Payment History',   desc: 'Past payments & receipts',         color: '#166534', bg: '#f0fdf4' },
              { key: 'announcements',   label: 'Announcements',     desc: 'Messages from your landlord',      color: '#92400e', bg: '#fef3c7' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '12px 14px', marginBottom: '8px',
                  background: item.bg, border: 'none', borderRadius: '10px',
                  cursor: 'pointer', textAlign: 'left', transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                </div>
                <span style={{ color: item.color, fontWeight: 700 }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
