import React, { useState, useEffect } from 'react'
import {
  CreditCard, Plus, Loader2, RefreshCw, CheckCircle2,
  DollarSign, Hourglass, XCircle, Eye, AlertCircle, FileText, ExternalLink,
  Settings, QrCode, Sparkles, Smartphone, Building, ShieldCheck, Trash2, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { encryptData, decryptData, decryptObject } from '../../../lib/encryptionHelper'
import { createNotification } from '../../../lib/notifyHelper'
import { sanitizeError, logError } from '../../../lib/errorHandler'

export default function PaymentsSection({ currentUser }) {
  const [payments, setPayments] = useState([])
  const [rentals, setRentals] = useState([])
  const [bills, setBills] = useState([])
  const [paymentSettings, setPaymentSettings] = useState(null)
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  const [settingsTab, setSettingsTab] = useState('gcash') // 'gcash' | 'maya' | 'bank' | 'instructions'
  const [savingSettings, setSavingSettings] = useState(false)

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'verified' | 'all'
  const [showForm, setShowForm] = useState(false)

  // Manual payment form state
  const [form, setForm] = useState({
    rental_id: '', bill_id: '', amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    method: 'Cash', reference_number: '', notes: ''
  })

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    gcash_name: '',
    gcash_number: '',
    gcash_qr_url: null,
    gcash_enabled: true,

    maya_name: '',
    maya_number: '',
    maya_qr_url: null,
    maya_enabled: false,

    bank_name: 'BDO Unibank',
    bank_account_name: '',
    bank_account_number: '',
    bank_enabled: false,

    instructions: 'Please take a clear screenshot of your payment receipt and make sure the Reference / Transaction Number is visible.'
  })

  const [submitting, setSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [rejectingPayment, setRejectingPayment] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: paymentsData, error: pErr } = await supabase
        .from('payments')
        .select('*, rentals(*, rooms(*), boarder:users!user_id(*)), bills(*)')
        .order('created_at', { ascending: false })

      if (pErr) console.error('Error fetching payments:', pErr)

      const { data: rentalsData } = await supabase
        .from('rentals')
        .select('*, rooms(*), boarder:users!user_id(*)')
        .eq('status', 'Active')

      // Fetch unpaid/partial bills with rental info for the manual form
      const { data: billsData } = await supabase
        .from('bills')
        .select('*, rentals(*, rooms(*), boarder:users!user_id(*))')
        .in('status', ['Unpaid', 'Partial'])
        .order('billing_month', { ascending: false })

      // Fetch landlord's payment settings
      const { data: userProfile } = await supabase
        .from('users').select('id, name').eq('auth_id', currentUser?.id).maybeSingle()

      if (userProfile?.id) {
        const { data: settingsData } = await supabase
          .from('payment_settings')
          .select('*')
          .eq('landlord_id', userProfile.id)
          .maybeSingle()

        if (settingsData) {
          const decSettings = decryptObject(settingsData, ['gcash_number', 'gcash_name', 'bank_account_number', 'bank_account_name'])
          setPaymentSettings(decSettings)
          setSettingsForm({
            gcash_name: decSettings.gcash_name || '',
            gcash_number: decSettings.gcash_number || '',
            gcash_qr_url: decSettings.gcash_qr_url || null,
            gcash_enabled: decSettings.gcash_enabled ?? true,

            maya_name: decSettings.maya_name || '',
            maya_number: decSettings.maya_number || '',
            maya_qr_url: decSettings.maya_qr_url || null,
            maya_enabled: decSettings.maya_enabled ?? false,

            bank_name: decSettings.bank_name || 'BDO Unibank',
            bank_account_name: decSettings.bank_account_name || '',
            bank_account_number: decSettings.bank_account_number || '',
            bank_enabled: decSettings.bank_enabled ?? false,

            instructions: decSettings.instructions || 'Please take a clear screenshot of your payment receipt and make sure the Reference / Transaction Number is visible.'
          })
        } else if (userProfile?.name) {
          setSettingsForm(f => ({
            ...f,
            gcash_name: userProfile.name,
            maya_name: userProfile.name,
            bank_account_name: userProfile.name
          }))
        }
      }

      const pList = (paymentsData || []).map(p => decryptObject(p, ['reference_number', 'notes', 'rejection_reason']))
      setPayments(pList)
      setRentals(rentalsData || [])
      setBills(billsData || [])

      // Auto-switch tab to 'pending' if there are pending items, else 'verified'
      const pendingCount = pList.filter(p => p.status === 'Pending').length
      if (pendingCount === 0 && activeTab === 'pending') {
        setActiveTab('verified')
      }
    } catch (err) {
      console.error('Error fetching payments data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getLandlordId = async () => {
    let authId = currentUser?.id
    if (!authId) {
      const { data: { session } } = await supabase.auth.getSession()
      authId = session?.user?.id
    }
    const { data } = await supabase
      .from('users').select('id').eq('auth_id', authId).maybeSingle()
    return data?.id || null
  }

  // When rental changes in manual form, auto-select the matching unpaid bill
  const handleRentalChange = (rentalId) => {
    const matchingBill = bills.find(b => String(b.rental_id) === String(rentalId))
    setForm(f => ({ ...f, rental_id: rentalId, bill_id: matchingBill?.id ? String(matchingBill.id) : '' }))
  }

  // Handle QR code image upload
  const handleQrUpload = (channel, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('QR code image should be under 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (channel === 'gcash') {
        setSettingsForm(f => ({ ...f, gcash_qr_url: reader.result }))
      } else if (channel === 'maya') {
        setSettingsForm(f => ({ ...f, maya_qr_url: reader.result }))
      }
    }
    reader.readAsDataURL(file)
  }

  // Save landlord payment settings (QR codes, numbers, bank accounts)
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    setErrorMsg('')
    try {
      const landlordId = await getLandlordId()
      if (!landlordId) throw new Error('Landlord profile not found.')

      const payload = {
        landlord_id: landlordId,

        gcash_name: encryptData(settingsForm.gcash_name.trim()),
        gcash_number: encryptData(settingsForm.gcash_number.trim()),
        gcash_qr_url: settingsForm.gcash_qr_url,
        gcash_enabled: settingsForm.gcash_enabled,

        maya_name: settingsForm.maya_name.trim(),
        maya_number: settingsForm.maya_number.trim(),
        maya_qr_url: settingsForm.maya_qr_url,
        maya_enabled: settingsForm.maya_enabled,

        bank_name: settingsForm.bank_name.trim(),
        bank_account_name: encryptData(settingsForm.bank_account_name.trim()),
        bank_account_number: encryptData(settingsForm.bank_account_number.trim()),
        bank_enabled: settingsForm.bank_enabled,

        instructions: settingsForm.instructions.trim(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('payment_settings')
        .upsert(payload, { onConflict: 'landlord_id' })

      if (error) throw error

      try {
        const clientIp = typeof window !== 'undefined'
          ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '127.0.0.1 (Localhost)' : window.location.hostname)
          : '127.0.0.1 (Localhost)'

        await supabase.from('audit_logs').insert({
          user_id: landlordId,
          action: 'UPDATE_PAYMENT_SETTINGS',
          target_type: 'PAYMENT_SETTINGS',
          description: `Landlord updated payment channels (GCash: ${settingsForm.gcash_enabled ? 'ON' : 'OFF'}, Maya: ${settingsForm.maya_enabled ? 'ON' : 'OFF'}, Bank: ${settingsForm.bank_enabled ? 'ON' : 'OFF'})`,
          ip_address: encryptData(clientIp)
        })
      } catch (_) { }

      setSuccessMsg('Payment setup & QR codes saved successfully!')
      setShowSettingsForm(false)
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchData()
    } catch (err) {
      logError('PaymentsSection.saveSettings', err)
      setErrorMsg(sanitizeError(err, 'payment'))
    } finally {
      setSavingSettings(false)
    }
  }

  // 1-Click Verification & Approval
  const handleVerifyAndApprove = async (payment) => {
    setProcessingId(payment.id)
    setErrorMsg('')
    try {
      const landlordId = await getLandlordId()
      const amount = Number(payment.amount)

      // 1. Update payment status to 'Paid'
      const { error: payErr } = await supabase
        .from('payments')
        .update({
          status: 'Paid',
          recorded_by: landlordId,
        })
        .eq('id', payment.id)

      if (payErr) throw payErr

      // 2. Update the matching bill if linked
      if (payment.bill_id) {
        const { data: currentBill } = await supabase
          .from('bills')
          .select('*')
          .eq('id', payment.bill_id)
          .single()

        if (currentBill) {
          const billAmount = Number(currentBill.amount || 0)
          const newStatus = amount >= billAmount ? 'Paid' : 'Unpaid'

          await supabase.from('bills').update({
            status: newStatus
          }).eq('id', currentBill.id)

          // Auto-rollover: if bill is now fully Paid, create next month's bill
          if (newStatus === 'Paid') {
            const currentMonth = new Date(currentBill.billing_month)
            const nextMonth = new Date(currentMonth)
            nextMonth.setMonth(nextMonth.getMonth() + 1)
            const nextDueDate = new Date(nextMonth)
            nextDueDate.setDate(5)

            // Check if next month's bill already exists
            const { data: existingNext } = await supabase
              .from('bills')
              .select('id')
              .eq('rental_id', currentBill.rental_id)
              .eq('billing_month', nextMonth.toISOString().split('T')[0])
              .maybeSingle()

            if (!existingNext) {
              await supabase.from('bills').insert({
                rental_id: currentBill.rental_id,
                user_id: currentBill.user_id,
                billing_month: nextMonth.toISOString().split('T')[0],
                amount: currentBill.amount,
                due_date: nextDueDate.toISOString().split('T')[0],
                status: 'Unpaid'
              })

              // Notify the boarder a new bill has been generated
              const boarderUserId = payment.rentals?.boarder?.id || currentBill.user_id
              if (boarderUserId) {
                const monthLabel = nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
                await createNotification(
                  boarderUserId,
                  '🧾 New Bill Generated',
                  `Your bill for ${monthLabel} of ₱${Number(currentBill.amount).toLocaleString()} is now due on ${nextDueDate.toLocaleDateString()}.`,
                  'new_bill'
                )
              }
            }
          }
        }
      }

      // 3. If the rental has a scheduled move-out, clear it automatically upon payment verification
      if (payment.rental_id) {
        await supabase
          .from('audit_logs')
          .delete()
          .eq('action', 'SCHEDULE_MOVEOUT')
          .eq('target_id', payment.rental_id)

        await supabase.from('audit_logs').insert({
          user_id: payment.rentals?.user_id || landlordId,
          action: 'CANCEL_MOVEOUT',
          target_type: 'RENTALS',
          target_id: payment.rental_id,
          description: `Payment verified. Scheduled move-out cleared for rental #${payment.rental_id}.`
        })

        await supabase
          .from('rentals')
          .update({ status: 'Active' })
          .eq('id', payment.rental_id)
      }

      // 4. Log Audit event
      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'VERIFY_PAYMENT',
        target_type: 'PAYMENTS',
        target_id: payment.id,
        description: `Landlord verified payment #${payment.id} of ₱${amount.toLocaleString()} (${payment.method}, Ref: ${payment.reference_number || 'N/A'})`
      })

      // Notify the boarder their payment was verified
      const boarderUserId = payment.rentals?.boarder?.id
      if (boarderUserId) {
        await createNotification(
          boarderUserId,
          '✅ Payment Verified & Lease Active',
          `Your payment of ₱${amount.toLocaleString()} via ${payment.method} has been verified and approved. Any pending move-out notices have been cleared.`,
          'payment_submitted'
        )
      }

      setSuccessMsg(`Payment of ₱${amount.toLocaleString()} verified and approved!`)
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchData()
    } catch (err) {
      logError('PaymentsSection.verifyPayment', err)
      setErrorMsg(sanitizeError(err, 'payment'))
    } finally {
      setProcessingId(null)
    }
  }

  // Reject payment proof
  const handleRejectPayment = async () => {
    if (!rejectingPayment) return
    setProcessingId(rejectingPayment.id)
    try {
      const landlordId = await getLandlordId()
      const { error: rejectErr } = await supabase
        .from('payments')
        .update({
          status: 'Rejected',
          rejection_reason: encryptData(rejectReason.trim() || 'Invalid payment proof / reference number'),
          recorded_by: landlordId
        })
        .eq('id', rejectingPayment.id)

      if (rejectErr) throw rejectErr

      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'REJECT_PAYMENT',
        target_type: 'PAYMENTS',
        target_id: rejectingPayment.id,
        description: `Landlord rejected payment #${rejectingPayment.id}: ${rejectReason.trim() || 'Invalid proof'}`
      })

      // Notify the boarder their payment was rejected
      const boarderUserId = rejectingPayment.rentals?.boarder?.id
      if (boarderUserId) {
        await createNotification(
          boarderUserId,
          '⚠️ Payment Rejected',
          `Your payment submission was rejected. Reason: ${rejectReason.trim() || 'Invalid payment proof / reference number'}. Please resubmit with a valid receipt.`,
          'application_rejected'
        )
      }

      setSuccessMsg('Payment submission marked as rejected.')
      setRejectingPayment(null)
      setRejectReason('')
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchData()
    } catch (err) {
      logError('PaymentsSection.rejectPayment', err)
      alert(sanitizeError(err, 'payment'))
    } finally {
      setProcessingId(null)
    }
  }

  // Manual Landlord Record Form Submission
  const handleRecord = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    try {
      const landlordId = await getLandlordId()
      const amount = parseFloat(form.amount)

      const selectedBill = form.bill_id ? bills.find(b => b.id === parseInt(form.bill_id, 10)) : null
      const monthCovered = selectedBill?.billing_month || form.payment_date

      const { data: newPay, error: payErr } = await supabase.from('payments').insert({
        rental_id: parseInt(form.rental_id, 10),
        bill_id: form.bill_id ? parseInt(form.bill_id, 10) : null,
        amount,
        payment_date: form.payment_date,
        month_covered: monthCovered,
        method: form.method,
        reference_number: form.reference_number.trim() ? encryptData(form.reference_number.trim()) : null,
        notes: form.notes ? encryptData(form.notes) : null,
        recorded_by: landlordId,
        status: 'Paid'
      }).select().single()

      if (payErr) throw payErr

      // Update bill status if a bill was selected
      if (form.bill_id) {
        const bill = bills.find(b => b.id === parseInt(form.bill_id, 10))
        if (bill) {
          const billAmount = Number(bill.amount || 0)
          const newStatus = amount >= billAmount ? 'Paid' : 'Unpaid'

          await supabase.from('bills').update({
            status: newStatus
          }).eq('id', bill.id)

          // If fully paid → auto-create next month's bill
          if (newStatus === 'Paid') {
            const currentMonth = new Date(bill.billing_month)
            const nextMonth = new Date(currentMonth)
            nextMonth.setMonth(nextMonth.getMonth() + 1)
            const nextDueDate = new Date(nextMonth)
            nextDueDate.setDate(5)

            const { data: existingNext } = await supabase
              .from('bills')
              .select('id')
              .eq('rental_id', bill.rental_id)
              .eq('billing_month', nextMonth.toISOString().split('T')[0])
              .maybeSingle()

            if (!existingNext) {
              await supabase.from('bills').insert({
                rental_id: bill.rental_id,
                user_id: bill.user_id,
                billing_month: nextMonth.toISOString().split('T')[0],
                amount: bill.amount,
                due_date: nextDueDate.toISOString().split('T')[0],
                status: 'Unpaid'
              })
            }
          }
        }
      }

      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'RECORD_PAYMENT',
        target_type: 'PAYMENTS',
        target_id: newPay?.id,
        description: `Landlord recorded payment of ₱${amount.toLocaleString()} for rental #${form.rental_id}`
      })

      // Notify the boarder their payment was recorded
      const selectedRental = rentals.find(r => r.id === parseInt(form.rental_id))
      if (selectedRental?.boarder?.id) {
        await createNotification(
          selectedRental.boarder.id,
          '💵 Payment Recorded by Landlord',
          `A payment of ₱${amount.toLocaleString()} (${form.method}) was recorded for your rental by the landlord.`,
          'payment_submitted'
        )
      }

      setSuccessMsg('Payment recorded and verified successfully!')
      setForm({
        rental_id: '', bill_id: '', amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        method: 'Cash', reference_number: '', notes: ''
      })
      setShowForm(false)
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchData()
    } catch (err) {
      logError('PaymentsSection.recordPayment', err)
      setErrorMsg(sanitizeError(err, 'payment'))
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered payments by active tab
  const pendingPayments = payments.filter(p => p.status === 'Pending')
  const verifiedPayments = payments.filter(p => p.status === 'Paid')
  const totalCollected = verifiedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const displayedPayments = activeTab === 'pending'
    ? pendingPayments
    : activeTab === 'verified'
    ? verifiedPayments
    : payments

  const formatMonth = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Payments & Verification</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Configure receiving accounts & verify boarder digital payment proofs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setShowSettingsForm(!showSettingsForm)
              if (showForm) setShowForm(false)
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              borderColor: showSettingsForm ? '#166534' : '#bbf7d0',
              background: showSettingsForm ? '#166534' : '#f0fdf4',
              color: showSettingsForm ? '#fff' : '#166534',
              fontWeight: 700
            }}
          >
            <Settings size={15} /> Payment Setup {showSettingsForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowForm(!showForm)
              if (showSettingsForm) setShowSettingsForm(false)
            }}
          >
            <Plus size={16} /> Record Cash Payment
          </button>
        </div>
      </div>

      {/* Payment Setup Prompt Banner if not configured */}
      {(!loading && !paymentSettings?.gcash_number && !paymentSettings?.bank_account_number && !showSettingsForm) && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px 20px',
          marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <QrCode size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#166534' }}>
                Set up your GCash QR Code & Receiving Accounts
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                Add your GCash QR code image and bank account details so boarders can scan and pay directly from their dashboard.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSettingsForm(true)}
            className="btn btn-primary btn-sm"
            style={{ background: '#166534', border: 'none', whiteSpace: 'nowrap', fontWeight: 700 }}
          >
            <Settings size={14} /> Setup Now
          </button>
        </div>
      )}

      {/* ── IN-PAGE EXPANDABLE PAYMENT SETUP PANEL ── */}
      {showSettingsForm && (
        <div style={{
          background: '#fff', border: '1.5px solid #86efac', borderRadius: '16px',
          padding: '24px 28px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(34, 197, 94, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                <Settings size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                  Landlord Payment Setup & QR Codes
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                  Configure what payment methods and QR codes appear in the boarder portal
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsForm(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
            >
              ✕
            </button>
          </div>

          {/* Settings Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap' }}>
            {[
              { key: 'gcash', label: 'GCash & QR Code', icon: Smartphone },
              { key: 'maya', label: 'Maya Wallet', icon: Smartphone },
              { key: 'bank', label: 'Bank Transfer (BDO/BPI)', icon: Building },
              { key: 'instructions', label: 'Notes / Reminders', icon: ShieldCheck },
            ].map(tab => {
              const Icon = tab.icon
              const isActive = settingsTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSettingsTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '10px', border: '1px solid',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                    background: isActive ? '#166534' : '#f8fafc',
                    color: isActive ? '#fff' : '#475569',
                    borderColor: isActive ? '#166534' : '#e2e8f0',
                    transition: 'all 0.15s'
                  }}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSaveSettings}>
            {/* GCash Settings */}
            {settingsTab === 'gcash' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534' }}>Enable GCash Payments</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Allow boarders to pay via GCash and scan your QR code</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.gcash_enabled}
                    onChange={e => setSettingsForm(f => ({ ...f, gcash_enabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#166534' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                      GCash Account Name *
                    </label>
                    <input
                      type="text"
                      required={settingsForm.gcash_enabled}
                      placeholder="e.g. Juan Dela Cruz"
                      value={settingsForm.gcash_name}
                      onChange={e => setSettingsForm(f => ({ ...f, gcash_name: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                      GCash Mobile Number *
                    </label>
                    <input
                      type="text"
                      required={settingsForm.gcash_enabled}
                      placeholder="e.g. 0917 123 4567"
                      value={settingsForm.gcash_number}
                      onChange={e => setSettingsForm(f => ({ ...f, gcash_number: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.04em' }}
                    />
                  </div>
                </div>

                {/* QR Code Upload */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                    Upload GCash QR Code Image
                  </label>
                  <div style={{
                    border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px',
                    textAlign: 'center', background: '#f8fafc', position: 'relative'
                  }}>
                    {settingsForm.gcash_qr_url ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={settingsForm.gcash_qr_url}
                          alt="GCash QR"
                          style={{ width: '140px', height: '140px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label style={{
                            cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1',
                            padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569'
                          }}>
                            Change QR Image
                            <input type="file" accept="image/*" onChange={e => handleQrUpload('gcash', e)} style={{ display: 'none' }} />
                          </label>
                          <button
                            type="button"
                            onClick={() => setSettingsForm(f => ({ ...f, gcash_qr_url: null }))}
                            style={{
                              background: '#fee2e2', border: '1px solid #fecaca',
                              padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <QrCode size={32} color="#166534" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#166534' }}>
                          Click to Upload GCash QR Code Screenshot
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG or JPG (Screenshots from GCash app work great)</span>
                        <input type="file" accept="image/*" onChange={e => handleQrUpload('gcash', e)} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Maya Settings */}
            {settingsTab === 'maya' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fdf4ff', border: '1px solid #f5d0fe', padding: '12px 16px', borderRadius: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#86198f' }}>Enable Maya Payments</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Allow boarders to pay via Maya Wallet</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.maya_enabled}
                    onChange={e => setSettingsForm(f => ({ ...f, maya_enabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#86198f' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                      Maya Account Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Juan Dela Cruz"
                      value={settingsForm.maya_name}
                      onChange={e => setSettingsForm(f => ({ ...f, maya_name: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                      Maya Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0918 765 4321"
                      value={settingsForm.maya_number}
                      onChange={e => setSettingsForm(f => ({ ...f, maya_number: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.04em' }}
                    />
                  </div>
                </div>

                {/* QR Code Upload */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                    Maya QR Code Image (Optional)
                  </label>
                  <div style={{
                    border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px',
                    textAlign: 'center', background: '#f8fafc', position: 'relative'
                  }}>
                    {settingsForm.maya_qr_url ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={settingsForm.maya_qr_url}
                          alt="Maya QR"
                          style={{ width: '140px', height: '140px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <label style={{
                            cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1',
                            padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569'
                          }}>
                            Change QR Image
                            <input type="file" accept="image/*" onChange={e => handleQrUpload('maya', e)} style={{ display: 'none' }} />
                          </label>
                          <button
                            type="button"
                            onClick={() => setSettingsForm(f => ({ ...f, maya_qr_url: null }))}
                            style={{
                              background: '#fee2e2', border: '1px solid #fecaca',
                              padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <QrCode size={32} color="#86198f" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#86198f' }}>
                          Upload Maya QR Code Image
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG or JPG</span>
                        <input type="file" accept="image/*" onChange={e => handleQrUpload('maya', e)} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bank Settings */}
            {settingsTab === 'bank' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e40af' }}>Enable Bank Transfer</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Allow boarders to pay via online bank deposit (BDO, BPI, etc.)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.bank_enabled}
                    onChange={e => setSettingsForm(f => ({ ...f, bank_enabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#1e40af' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                    Bank Name
                  </label>
                  <select
                    value={settingsForm.bank_name}
                    onChange={e => setSettingsForm(f => ({ ...f, bank_name: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: '#fff' }}
                  >
                    <option value="BDO Unibank">BDO Unibank</option>
                    <option value="Bank of the Philippine Islands (BPI)">Bank of the Philippine Islands (BPI)</option>
                    <option value="UnionBank of the Philippines">UnionBank of the Philippines</option>
                    <option value="Metrobank">Metrobank</option>
                    <option value="Land Bank of the Philippines">Land Bank of the Philippines</option>
                    <option value="RCBC">RCBC</option>
                    <option value="Security Bank">Security Bank</option>
                    <option value="Other Bank">Other Bank</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                      Account Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Juan Dela Cruz"
                      value={settingsForm.bank_account_name}
                      onChange={e => setSettingsForm(f => ({ ...f, bank_account_name: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0012 3456 7890"
                      value={settingsForm.bank_account_number}
                      onChange={e => setSettingsForm(f => ({ ...f, bank_account_number: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.04em' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes / Instructions */}
            {settingsTab === 'instructions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                    Instructions / Notes for Boarders
                  </label>
                  <textarea
                    rows={4}
                    value={settingsForm.instructions}
                    onChange={e => setSettingsForm(f => ({ ...f, instructions: e.target.value }))}
                    placeholder="e.g. Please ensure your GCash Reference Number is correct and upload the receipt screenshot."
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    This message is displayed directly to boarders inside their payment modal.
                  </span>
                </div>
              </div>
            )}

            {/* Save Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowSettingsForm(false)}
                disabled={savingSettings}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={savingSettings}
                style={{
                  background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                  border: 'none', minWidth: '150px'
                }}
              >
                {savingSettings ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Save Payment Setup
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>₱{totalCollected.toLocaleString()}</div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', opacity: 0.85 }}>Total Verified Collected</div>
        </div>
        <div
          onClick={() => setActiveTab('pending')}
          style={{
            background: pendingPayments.length > 0 ? '#fef3c7' : '#f8fafc',
            border: `1px solid ${pendingPayments.length > 0 ? '#fde68a' : '#e2e8f0'}`,
            borderRadius: '12px', padding: '16px 20px', cursor: 'pointer',
            outline: activeTab === 'pending' ? '2px solid #d97706' : 'none'
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: pendingPayments.length > 0 ? '#b45309' : '#64748b' }}>
            {pendingPayments.length}
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: pendingPayments.length > 0 ? '#b45309' : '#64748b' }}>
            Pending Verification {pendingPayments.length > 0 && '⚡ Action Required'}
          </div>
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af' }}>{verifiedPayments.length}</div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af', opacity: 0.85 }}>Verified Transactions</div>
        </div>
      </div>

      {successMsg && (
        <div className="alert-message alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert-message alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Manual Record Form (Dropdown toggle) */}
      {showForm && (
        <form onSubmit={handleRecord} style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px',
          padding: '24px', marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '18px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} /> Record Offline / Face-to-Face Payment
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Active Rental *</label>
              <select required value={form.rental_id} onChange={e => handleRentalChange(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem', background: '#fff' }}>
                <option value="">Choose rental...</option>
                {rentals.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.boarder?.name || r.boarder?.email} — {r.rooms?.room_number} (₱{Number(r.rooms?.price || 0).toLocaleString()}/mo)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Apply to Bill (Optional)</label>
              <select value={form.bill_id} onChange={e => setForm(f => ({ ...f, bill_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem', background: '#fff' }}>
                <option value="">No specific bill</option>
                {bills.filter(b => !form.rental_id || String(b.rental_id) === String(form.rental_id)).map(b => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.billing_month).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} — ₱{Number(b.amount || 0).toLocaleString()} due ({b.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Amount (₱) *</label>
              <input type="number" min={1} required placeholder="e.g. 3500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Payment Date *</label>
              <input type="date" required value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Payment Method</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem', background: '#fff' }}>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Reference # (Optional)</label>
              <input type="text" placeholder="e.g. 1029384756" value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
              <label>Notes (Optional)</label>
              <input type="text" placeholder="e.g. Handed cash in front desk" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <DollarSign size={14} />}
              Save & Verify Payment
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'pending', label: `Pending Verification (${pendingPayments.length})`, alert: pendingPayments.length > 0 },
          { key: 'verified', label: `Verified Payments (${verifiedPayments.length})` },
          { key: 'all', label: `All Records (${payments.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: '20px', border: '1px solid',
              fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
              background: activeTab === t.key ? '#2d6a4f' : '#fff',
              color: activeTab === t.key ? '#fff' : '#64748b',
              borderColor: activeTab === t.key ? '#2d6a4f' : '#e2e8f0',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pending Submissions Review Section */}
      {activeTab === 'pending' && (
        <div>
          {pendingPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
              <CheckCircle2 size={40} color="#22c55e" style={{ margin: '0 auto 14px' }} />
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#166534' }}>All Payments Verified!</h4>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No pending payment proofs awaiting landlord approval.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingPayments.map(p => {
                const billingText = p.bills?.billing_month ? formatMonth(p.bills.billing_month) : 'Rental Payment'
                return (
                  <div key={p.id} style={{
                    background: '#fff', border: '1px solid #fde68a', borderRadius: '16px',
                    padding: '22px 26px', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)',
                    borderLeft: '5px solid #f59e0b', position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {p.rentals?.boarder?.name || p.rentals?.boarder?.email || `Rental #${p.rental_id}`}
                          </h4>
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            Room {p.rentals?.rooms?.room_number || '—'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                          For {billingText} · Submitted on {p.payment_date}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#166534' }}>
                          ₱{Number(p.amount).toLocaleString()}
                        </div>
                        <span style={{
                          background: p.method === 'GCash' ? '#eff6ff' : '#f8fafc',
                          color: p.method === 'GCash' ? '#1d4ed8' : '#475569',
                          padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700
                        }}>
                          via {p.method}
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Reference Number Grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: p.proof_image_url ? '1fr auto' : '1fr',
                      gap: '16px', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px',
                      marginBottom: '16px', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '4px' }}>
                          Reference / Transaction #: <strong>{p.reference_number || 'N/A'}</strong>
                        </div>
                        {p.notes && (
                          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                            Notes: <em>"{p.notes}"</em>
                          </div>
                        )}
                      </div>

                      {p.proof_image_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(p.proof_image_url)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: '#fff', border: '1px solid #cbd5e1',
                            padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 700, color: '#334155'
                          }}
                        >
                          <Eye size={14} /> View Receipt Proof
                        </button>
                      )}
                    </div>

                    {/* 1-Click Verification Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={processingId === p.id}
                        onClick={() => setRejectingPayment(p)}
                        style={{ borderColor: '#fca5a5', color: '#991b1b' }}
                      >
                        <XCircle size={15} /> Reject Proof
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={processingId === p.id}
                        onClick={() => handleVerifyAndApprove(p)}
                        style={{
                          background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                          border: 'none', minWidth: '150px'
                        }}
                      >
                        {processingId === p.id ? (
                          <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        Verify & Approve
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Verified / All Payments Table */}
      {activeTab !== 'pending' && (
        <div>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
              Loading payments...
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Boarder', 'Room', 'Amount', 'Date', 'Method', 'Ref #', 'Status', 'Proof'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedPayments.map(p => {
                    const isPaid = p.status === 'Paid'
                    const isPending = p.status === 'Pending'
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                          {p.rentals?.boarder?.name || p.rentals?.boarder?.email || `Rental #${p.rental_id}`}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {p.rentals?.rooms?.room_number || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: isPaid ? '#166534' : '#92400e' }}>
                          ₱{Number(p.amount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {p.payment_date || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '12px', background: '#eff6ff', color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>
                            {p.method || 'Cash'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8125rem' }}>
                          {p.reference_number || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '12px',
                            background: isPaid ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                            color: isPaid ? '#166534' : isPending ? '#92400e' : '#991b1b',
                            fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {p.status || 'Paid'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.proof_image_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(p.proof_image_url)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              <Eye size={14} /> View
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {displayedPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No records found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Proof Image Preview Modal (For full-screen receipt verification) */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '16px',
              maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Payment Proof Screenshot</h4>
              <button onClick={() => setPreviewImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <img src={previewImage} alt="Payment Proof" style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '10px', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      {/* Reject Reason Dialog Modal */}
      {rejectingPayment && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px',
            maxWidth: '460px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#991b1b', marginBottom: '10px' }}>
              Reject Payment Proof
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>
              Specify why this payment proof cannot be verified so the boarder can re-submit.
            </p>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
                Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Reference number does not match receipt / amount is insufficient"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setRejectingPayment(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleRejectPayment}
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
