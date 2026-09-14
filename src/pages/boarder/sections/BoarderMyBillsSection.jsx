import React, { useState, useEffect } from 'react'
import {
  Receipt, AlertCircle, CheckCircle2, Clock, Loader2, CreditCard,
  Hourglass, Smartphone, Building, Copy, Check, Upload, Trash2,
  ChevronDown, ChevronUp, QrCode, HelpCircle, X, RefreshCw
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { notifyLandlords } from '../../../lib/notifyHelper'
import { sanitizeError, logError } from '../../../lib/errorHandler'

export default function BoarderMyBillsSection({ rentalData, currentUser }) {
  const [bills, setBills] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [paymentSettings, setPaymentSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  // In-page payment form state
  const [payingBill, setPayingBill] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState('gcash') // 'gcash' | 'maya' | 'bank' | 'cash'
  const [amount, setAmount] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [proofImage, setProofImage] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [copiedText, setCopiedText] = useState('')
  const [qrZoom, setQrZoom] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    if (rentalData?.id) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [rentalData])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch bills
      const { data: billsData } = await supabase
        .from('bills')
        .select('*')
        .eq('rental_id', rentalData.id)
        .order('billing_month', { ascending: false })

      // Fetch pending payments
      const { data: pendingData } = await supabase
        .from('payments')
        .select('*')
        .eq('rental_id', rentalData.id)
        .eq('status', 'Pending')

      // Fetch landlord's payment settings (QR code, account numbers)
      const { data: settingsData } = await supabase
        .from('payment_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      setBills(billsData || [])
      setPendingPayments(pendingData || [])
      if (settingsData) {
        setPaymentSettings(settingsData)
        if (settingsData.gcash_enabled) setSelectedChannel('gcash')
        else if (settingsData.maya_enabled) setSelectedChannel('maya')
        else if (settingsData.bank_enabled) setSelectedChannel('bank')
        else setSelectedChannel('cash')
      }
    } catch (err) {
      console.error('Error fetching bills & payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartPayment = (bill) => {
    if (payingBill?.id === bill.id) {
      setPayingBill(null) // toggle off if clicked again
      return
    }
    const balance = Math.max(0, Number(bill.amount_due) - Number(bill.amount_paid || 0))
    setPayingBill(bill)
    setAmount(balance > 0 ? balance : '')
    setRefNumber('')
    setNotes('')
    setProofImage(null)
    setProofPreview(null)
    setErrorMsg('')
  }

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(''), 2500)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Receipt screenshot should be under 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setProofPreview(reader.result)
      setProofImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    try {
      const numAmount = parseFloat(amount)
      const balance = Math.max(0, Number(payingBill.amount_due) - Number(payingBill.amount_paid || 0))

      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid payment amount.')
      }

      if (numAmount > balance) {
        throw new Error(`Amount cannot exceed the remaining balance of ₱${balance.toLocaleString()}.`)
      }

      if (!refNumber.trim() && selectedChannel !== 'cash') {
        const channelName = selectedChannel === 'gcash' ? 'GCash' : selectedChannel === 'maya' ? 'Maya' : 'Bank Transfer'
        throw new Error(`Please enter the ${channelName} Reference / Transaction Number.`)
      }

      let authId = currentUser?.id
      if (!authId) {
        const { data: { session } } = await supabase.auth.getSession()
        authId = session?.user?.id
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, name')
        .eq('auth_id', authId)
        .maybeSingle()

      const methodLabel = selectedChannel === 'gcash' ? 'GCash'
        : selectedChannel === 'maya' ? 'Maya'
        : selectedChannel === 'bank' ? (paymentSettings?.bank_name || 'Bank Transfer')
        : 'Cash'

      const { error: insertErr } = await supabase.from('payments').insert({
        rental_id: rentalData.id,
        bill_id: payingBill.id,
        amount: numAmount,
        payment_date: new Date().toISOString().split('T')[0],
        month_covered: payingBill.billing_month || new Date().toISOString().split('T')[0],
        method: methodLabel,
        reference_number: refNumber.trim() || null,
        proof_image_url: proofImage || null,
        notes: notes.trim() || null,
        submitted_by: userProfile?.id || null,
        status: 'Pending'
      })

      if (insertErr) throw insertErr

      if (userProfile?.id) {
        await supabase.from('audit_logs').insert({
          user_id: userProfile.id,
          action: 'SUBMIT_PAYMENT_PROOF',
          target_type: 'PAYMENTS',
          description: `Boarder submitted ${methodLabel} payment proof of ₱${numAmount.toLocaleString()} (Ref: ${refNumber.trim() || 'N/A'})`
        })
      }

      // Notify landlords of the payment submission
      const boarderName = userProfile?.name || currentUser?.email?.split('@')[0] || 'A boarder'
      await notifyLandlords(
        '💳 Payment Submitted for Verification',
        `${boarderName} submitted a ₱${numAmount.toLocaleString()} payment via ${methodLabel} (Ref: ${refNumber.trim() || 'Cash/Manual'}). Please review in Payments section.`,
        'payment_submitted'
      )

      setSuccessToast('Payment proof submitted successfully! Awaiting landlord 1-click verification.')
      setPayingBill(null)
      fetchData()
      setTimeout(() => setSuccessToast(''), 5000)
    } catch (err) {
      logError('BoarderMyBillsSection.submitPayment', err)
      setErrorMsg(sanitizeError(err, 'payment'))
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid':    return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', icon: <CheckCircle2 size={15} /> }
      case 'Partial': return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: <Clock size={15} /> }
      default:        return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: <AlertCircle size={15} /> }
    }
  }

  const formatBillingMonth = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (!rentalData) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Bills</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Your monthly billing statements</p>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <AlertCircle size={40} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>No Active Rental</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Bills will appear here once your rental is active.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Bills</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Your monthly billing statements — pay directly with GCash, Maya, or Bank transfer
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {successToast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
          background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
          fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)'
        }}>
          <CheckCircle2 size={18} color="#166534" />
          {successToast}
        </div>
      )}

      {/* ── IN-PAGE EXPANDABLE PAYMENT FORM ── */}
      {payingBill && (
        <div style={{
          background: '#fff', border: '1.5px solid #818cf8', borderRadius: '18px',
          padding: '26px 30px', marginBottom: '24px',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}>
                <CreditCard size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Pay Bill: {formatBillingMonth(payingBill.billing_month)}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                  Remaining Balance: <strong style={{ color: '#dc2626', fontSize: '0.9375rem' }}>₱{Math.max(0, Number(payingBill.amount_due) - Number(payingBill.amount_paid || 0)).toLocaleString()}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPayingBill(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Channel Selector Tabs */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', marginBottom: '8px' }}>
              SELECT PAYMENT METHOD
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedChannel('gcash')}
                style={{
                  flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid',
                  fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                  background: selectedChannel === 'gcash' ? '#eff6ff' : '#f8fafc',
                  borderColor: selectedChannel === 'gcash' ? '#2563eb' : '#e2e8f0',
                  color: selectedChannel === 'gcash' ? '#1d4ed8' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Smartphone size={16} /> GCash & QR
              </button>

              {paymentSettings?.maya_enabled && (
                <button
                  type="button"
                  onClick={() => setSelectedChannel('maya')}
                  style={{
                    flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                    background: selectedChannel === 'maya' ? '#fdf4ff' : '#f8fafc',
                    borderColor: selectedChannel === 'maya' ? '#86198f' : '#e2e8f0',
                    color: selectedChannel === 'maya' ? '#86198f' : '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Smartphone size={16} /> Maya Wallet
                </button>
              )}

              {paymentSettings?.bank_enabled && (
                <button
                  type="button"
                  onClick={() => setSelectedChannel('bank')}
                  style={{
                    flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                    background: selectedChannel === 'bank' ? '#f0fdf4' : '#f8fafc',
                    borderColor: selectedChannel === 'bank' ? '#166534' : '#e2e8f0',
                    color: selectedChannel === 'bank' ? '#166534' : '#475569',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Building size={16} /> Bank Deposit
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedChannel('cash')}
                style={{
                  flex: 1, minWidth: '100px', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid',
                  fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                  background: selectedChannel === 'cash' ? '#f1f5f9' : '#f8fafc',
                  borderColor: selectedChannel === 'cash' ? '#334155' : '#e2e8f0',
                  color: selectedChannel === 'cash' ? '#0f172a' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                Cash
              </button>
            </div>
          </div>

          {/* ── LANDLORD ACCOUNT & QR CARD ── */}
          {selectedChannel === 'gcash' && (
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
              borderRadius: '16px', padding: '20px 24px', color: '#fff', marginBottom: '20px',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  LANDLORD GCASH
                </span>
                <span style={{ fontSize: '0.75rem', color: '#bfdbfe' }}>Scan QR or Send Money</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: paymentSettings?.gcash_qr_url ? '1fr auto' : '1fr', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#bfdbfe', marginBottom: '2px' }}>Account Name</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
                    {paymentSettings?.gcash_name || 'Landlord / RoomEase Admin'}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#bfdbfe', marginBottom: '2px' }}>GCash Number</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>
                      {paymentSettings?.gcash_number || '0917 123 4567'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentSettings?.gcash_number || '09171234567', 'GCash Number')}
                      style={{
                        background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff',
                        padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      {copiedText === 'GCash Number' ? <Check size={14} color="#86efac" /> : <Copy size={14} />}
                      {copiedText === 'GCash Number' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {paymentSettings?.gcash_qr_url && (
                  <div style={{ textAlign: 'center' }}>
                    <div
                      onClick={() => setQrZoom(paymentSettings.gcash_qr_url)}
                      style={{
                        background: '#fff', padding: '6px', borderRadius: '12px',
                        cursor: 'pointer', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      title="Click to zoom QR Code"
                    >
                      <img
                        src={paymentSettings.gcash_qr_url}
                        alt="GCash QR Code"
                        style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block', borderRadius: '6px' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#bfdbfe', marginTop: '4px', cursor: 'pointer' }} onClick={() => setQrZoom(paymentSettings.gcash_qr_url)}>
                      🔍 Tap to Zoom
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedChannel === 'maya' && (
            <div style={{
              background: 'linear-gradient(135deg, #701a75 0%, #86198f 100%)',
              borderRadius: '16px', padding: '20px 24px', color: '#fff', marginBottom: '20px',
              boxShadow: '0 8px 20px rgba(134, 25, 143, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  LANDLORD MAYA
                </span>
                <span style={{ fontSize: '0.75rem', color: '#f5d0fe' }}>Send Money / QR</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: paymentSettings?.maya_qr_url ? '1fr auto' : '1fr', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#f5d0fe', marginBottom: '2px' }}>Account Name</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
                    {paymentSettings?.maya_name || 'Landlord / RoomEase Admin'}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#f5d0fe', marginBottom: '2px' }}>Maya Number</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>
                      {paymentSettings?.maya_number || '0918 765 4321'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentSettings?.maya_number || '09187654321', 'Maya Number')}
                      style={{
                        background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff',
                        padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      {copiedText === 'Maya Number' ? <Check size={14} color="#86efac" /> : <Copy size={14} />}
                      {copiedText === 'Maya Number' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {paymentSettings?.maya_qr_url && (
                  <div style={{ textAlign: 'center' }}>
                    <div
                      onClick={() => setQrZoom(paymentSettings.maya_qr_url)}
                      style={{
                        background: '#fff', padding: '6px', borderRadius: '12px',
                        cursor: 'pointer', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      <img
                        src={paymentSettings.maya_qr_url}
                        alt="Maya QR Code"
                        style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block', borderRadius: '6px' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#f5d0fe', marginTop: '4px', cursor: 'pointer' }} onClick={() => setQrZoom(paymentSettings.maya_qr_url)}>
                      🔍 Tap to Zoom
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedChannel === 'bank' && (
            <div style={{
              background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
              borderRadius: '16px', padding: '20px 24px', color: '#fff', marginBottom: '20px',
              boxShadow: '0 8px 20px rgba(22, 101, 52, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  BANK TRANSFER
                </span>
                <span style={{ fontSize: '0.75rem', color: '#bbf7d0' }}>{paymentSettings?.bank_name || 'BDO Unibank'}</span>
              </div>

              <div>
                <div style={{ fontSize: '0.8125rem', color: '#bbf7d0', marginBottom: '2px' }}>Account Name</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
                  {paymentSettings?.bank_account_name || 'Landlord / RoomEase Property'}
                </div>

                <div style={{ fontSize: '0.8125rem', color: '#bbf7d0', marginBottom: '2px' }}>Account Number</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>
                    {paymentSettings?.bank_account_number || '0012 3456 7890'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentSettings?.bank_account_number || '001234567890', 'Bank Account')}
                    style={{
                      background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff',
                      padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    {copiedText === 'Bank Account' ? <Check size={14} color="#86efac" /> : <Copy size={14} />}
                    {copiedText === 'Bank Account' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedChannel === 'cash' && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
              padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569'
              }}>
                <CreditCard size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>Hand-to-Hand Cash Payment</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Please hand cash directly to the landlord or front desk. Submit below to notify landlord for verification.
                </div>
              </div>
            </div>
          )}

          {/* Landlord Instructions note */}
          {paymentSettings?.instructions && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px',
              padding: '12px 16px', marginBottom: '18px', fontSize: '0.8125rem', color: '#166534',
              display: 'flex', alignItems: 'flex-start', gap: '8px'
            }}>
              <HelpCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div><strong>Note from Landlord:</strong> {paymentSettings.instructions}</div>
            </div>
          )}

          {errorMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.875rem',
              background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca'
            }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: selectedChannel !== 'cash' ? '1fr 1fr' : '1fr', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                  Amount to Pay (₱) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Math.max(0, Number(payingBill.amount_due) - Number(payingBill.amount_paid || 0))}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Remaining: ₱${Math.max(0, Number(payingBill.amount_due) - Number(payingBill.amount_paid || 0)).toLocaleString()}`}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit'
                  }}
                />
              </div>

              {selectedChannel !== 'cash' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                    {selectedChannel === 'gcash' ? 'GCash' : selectedChannel === 'maya' ? 'Maya' : 'Bank'} Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="e.g. 1029 3847 5612"
                    style={{
                      width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
                      borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit',
                      letterSpacing: '0.04em', fontWeight: 600
                    }}
                  />
                </div>
              )}
            </div>

            {/* Proof Upload (Screenshot) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                Upload Screenshot / Receipt Proof {selectedChannel !== 'cash' ? '(Recommended)' : '(Optional)'}
              </label>
              <div style={{
                border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px',
                textAlign: 'center', background: '#f8fafc', cursor: 'pointer', position: 'relative'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{
                    position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%'
                  }}
                />
                {proofPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'center' }}>
                    <img
                      src={proofPreview}
                      alt="Proof Preview"
                      style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#166534' }}>✓ Receipt Screenshot Attached</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Click to replace photo</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Upload size={24} color="#64748b" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#4338ca' }}>
                      Tap to upload GCash receipt screenshot
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG or JPG up to 5MB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Sent via my brother's GCash account"
                style={{
                  width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
                  borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPayingBill(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={submitting}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none', minWidth: '180px'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Submit for Verification
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BILLS LIST ── */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
          Loading bills...
        </div>
      ) : bills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
          <CheckCircle2 size={40} color="#22c55e" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px', color: '#166534' }}>No Bills Yet</h4>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your billing statements will appear here once generated by your landlord.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bills.map((bill, index) => {
            const s = getStatusStyle(bill.status)
            const balance = Math.max(0, Number(bill.amount_due) - Number(bill.amount_paid || 0))
            const isPaid = bill.status === 'Paid'
            const isPartial = bill.status === 'Partial'
            const isLatest = index === 0
            const isCurrentlySelected = payingBill?.id === bill.id

            // Check if there is a pending payment submitted for this bill
            const pending = pendingPayments.find(p => p.bill_id === bill.id)

            return (
              <div key={bill.id} style={{
                background: '#fff',
                border: `1.5px solid ${isCurrentlySelected ? '#6366f1' : isLatest && !isPaid ? s.border : '#e2e8f0'}`,
                borderRadius: '16px',
                padding: '24px 28px',
                boxShadow: isCurrentlySelected ? '0 8px 25px rgba(99, 102, 241, 0.12)' : isLatest && !isPaid ? '0 4px 20px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.03)',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s'
              }}>
                {isLatest && !isPaid && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: bill.status === 'Partial'
                      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      : 'linear-gradient(90deg, #ef4444, #f87171)'
                  }} />
                )}

                {/* Bill Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: s.color
                    }}>
                      <Receipt size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        {formatBillingMonth(bill.billing_month)}
                      </div>
                      {isLatest && <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Current Bill</div>}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    padding: '5px 14px', borderRadius: '20px',
                    fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em'
                  }}>
                    {s.icon} {(bill.status || 'UNPAID').toUpperCase()}
                  </span>
                </div>

                {/* Bill Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                  {[
                    { label: 'Monthly Rent',  value: `₱${Number(bill.amount_due).toLocaleString()}` },
                    { label: 'Due Date',       value: formatDate(bill.due_date) },
                    { label: 'Amount Paid',    value: `₱${Number(bill.amount_paid || 0).toLocaleString()}`, highlight: Number(bill.amount_paid || 0) > 0 },
                    { label: 'Balance',        value: `₱${balance.toLocaleString()}`, urgent: !isPaid && balance > 0 },
                  ].map((row, i) => (
                    <div key={row.label} style={{
                      padding: '12px 16px',
                      background: i % 2 === 0 ? '#f8fafc' : '#fff',
                      borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none',
                      borderRight: i % 2 === 0 ? '1px solid #f1f5f9' : 'none',
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>{row.label}</div>
                      <div style={{
                        fontSize: '1rem', fontWeight: 800,
                        color: row.urgent ? '#dc2626' : row.highlight ? '#166534' : '#0f172a'
                      }}>
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Partial progress bar */}
                {isPartial && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                      <span>Payment Progress</span>
                      <span>{Math.round((Number(bill.amount_paid) / Number(bill.amount_due)) * 100)}% paid</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(Number(bill.amount_paid) / Number(bill.amount_due)) * 100}%`,
                        background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                        borderRadius: '3px', transition: 'width 0.5s'
                      }} />
                    </div>
                  </div>
                )}

                {/* Action Section */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  {pending ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: '#fef3c7', border: '1px solid #fde68a',
                      padding: '8px 14px', borderRadius: '10px', color: '#92400e',
                      fontSize: '0.8125rem', fontWeight: 600
                    }}>
                      <Hourglass size={16} />
                      <span>
                        Payment of <strong>₱{Number(pending.amount).toLocaleString()}</strong> ({pending.method}) is <strong>Under Landlord Verification</strong>
                        {pending.reference_number && ` · Ref: ${pending.reference_number}`}
                      </span>
                    </div>
                  ) : isPaid ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '0.875rem', fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> Paid in Full
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartPayment(bill)}
                      className="btn btn-primary btn-sm"
                      style={{
                        background: isCurrentlySelected ? '#3730a3' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px', fontSize: '0.875rem', fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)', borderRadius: '10px'
                      }}
                    >
                      <CreditCard size={16} /> {isCurrentlySelected ? 'Close Payment Form' : 'Pay Bill / Submit Proof'}
                    </button>
                  )}

                  {!isPaid && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Accepts GCash, Maya, Bank Transfer & Cash Deposit
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QR Code Zoom Popup */}
      {qrZoom && (
        <div
          onClick={() => setQrZoom(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '20px',
              maxWidth: '360px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Scan QR Code</h4>
              <button onClick={() => setQrZoom(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <img src={qrZoom} alt="QR Zoom" style={{ width: '100%', borderRadius: '10px', objectFit: 'contain' }} />
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px', marginBottom: 0 }}>
              Scan directly in your GCash / Maya app or save screenshot to scan from gallery.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
