import React, { useState, useEffect } from 'react'
import { CreditCard, AlertCircle, CheckCircle2, Loader2, Hourglass, XCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function BoarderPaymentHistorySection({ rentalData }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (rentalData?.id) fetchPayments()
    else setLoading(false)
  }, [rentalData])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, bills(billing_month)')
        .eq('rental_id', rentalData.id)
        .order('payment_date', { ascending: false })
      setPayments(data || [])
    } catch (err) {
      console.error('Error fetching payment history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatBillingMonth = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  }

  const methodColor = (method) => {
    switch (method) {
      case 'GCash':         return { bg: '#eff6ff', color: '#1d4ed8' }
      case 'Maya':          return { bg: '#fdf4ff', color: '#86198f' }
      case 'Bank Transfer': return { bg: '#f0fdf4', color: '#166534' }
      case 'Check':         return { bg: '#fef3c7', color: '#92400e' }
      default:              return { bg: '#f8fafc', color: '#475569' } // Cash
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return {
          bg: '#fef3c7', color: '#92400e', border: '#fde68a',
          label: 'Verification Pending', icon: <Hourglass size={13} />
        }
      case 'Rejected':
        return {
          bg: '#fee2e2', color: '#991b1b', border: '#fecaca',
          label: 'Rejected', icon: <XCircle size={13} />
        }
      default: // Paid / Verified
        return {
          bg: '#dcfce7', color: '#166534', border: '#bbf7d0',
          label: 'Verified & Paid', icon: <CheckCircle2 size={13} />
        }
    }
  }

  // Only sum verified / paid payments
  const totalPaid = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  if (!rentalData) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Payment History</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>All your past payment transactions</p>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <AlertCircle size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>No Active Rental</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Payment history will appear here once your rental is active.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Payment History</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>All your past payment transactions and verification status</p>
        </div>
        {payments.length > 0 && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '12px', padding: '10px 18px', textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>TOTAL VERIFIED PAID</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
              ₱{totalPaid.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading payment history...
        </div>
      ) : payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <CreditCard size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>No Payments Yet</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your payment history and submissions will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {payments.map((payment) => {
            const mc = methodColor(payment.method)
            const st = getStatusBadge(payment.status)
            const billingLabel = payment.bills?.billing_month
              ? formatBillingMonth(payment.bills.billing_month)
              : payment.notes || null

            return (
              <div key={payment.id} style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '14px', padding: '18px 22px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Icon */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: st.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: st.color
                  }}>
                    {st.icon}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {billingLabel || formatDate(payment.payment_date)}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                        padding: '2px 8px', borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 700
                      }}>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>Submitted on {formatDate(payment.payment_date)}</span>
                      {payment.reference_number && (
                        <span>· Ref #: <strong style={{ color: '#334155' }}>{payment.reference_number}</strong></span>
                      )}
                    </div>

                    {payment.rejection_reason && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#991b1b', background: '#fef2f2', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                        Reason: {payment.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Method Badge */}
                  <span style={{
                    background: mc.bg, color: mc.color,
                    padding: '4px 12px', borderRadius: '12px',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                  }}>
                    {payment.method || 'Cash'}
                  </span>

                  {/* Amount */}
                  <div style={{
                    fontSize: '1.125rem', fontWeight: 800,
                    color: payment.status === 'Paid' ? '#166534' : payment.status === 'Rejected' ? '#991b1b' : '#92400e',
                    flexShrink: 0, minWidth: '90px', textAlign: 'right'
                  }}>
                    ₱{Number(payment.amount).toLocaleString()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
