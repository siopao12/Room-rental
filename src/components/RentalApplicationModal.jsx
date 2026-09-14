import React, { useState } from 'react'
import { X, Calendar, Phone, User, MessageSquare, Loader2, Send, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { notifyLandlords } from '../lib/notifyHelper'
import { sanitizeError, logError } from '../lib/errorHandler'

// ─── Validation Helpers ───────────────────────────────────────────────────────

/** Only letters, spaces, hyphens, apostrophes — no digits */
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/

/**
 * PH phone validation:
 * Accepts: 09XXXXXXXXX (mobile), +639XXXXXXXXX, 02-XXXX-XXXX (landline), plain digits 7–15
 */
const PHONE_REGEX = /^(\+63|0)?(9\d{9}|[2-8]\d{6,9})$/

function isValidPhone(val) {
  // Strip common separators before testing
  return PHONE_REGEX.test(val.replace(/[\s\-().]/g, ''))
}


export default function RentalApplicationModal({ isOpen, onClose, room, currentUser, onApplicationSubmitted }) {
  const [moveInDate, setMoveInDate] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [message, setMessage] = useState('')

  const [loading, setLoading]       = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Per-field inline validation errors
  const [fieldErrors, setFieldErrors] = useState({})

  const clearFieldError = (key) =>
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })

  // ── Change handlers with live inline validation ──────────────────────────

  const handleEmergencyNameChange = (e) => {
    const val = e.target.value
    setEmergencyName(val)
    if (val && !NAME_REGEX.test(val)) {
      setFieldErrors(prev => ({ ...prev, emergencyName: 'Name must only contain letters, spaces, hyphens, or apostrophes.' }))
    } else {
      clearFieldError('emergencyName')
    }
  }

  const handleEmergencyPhoneChange = (e) => {
    const val = e.target.value
    setEmergencyPhone(val)
    if (val && !isValidPhone(val)) {
      setFieldErrors(prev => ({ ...prev, emergencyPhone: 'Enter a valid PH phone number (e.g. 09123456789 or +639123456789).' }))
    } else {
      clearFieldError('emergencyPhone')
    }
  }

  // ── Client-side validation gate ──────────────────────────────────────────

  const validateForm = () => {
    const errors = {}
    if (!moveInDate)
      errors.moveInDate = 'Please select a desired move-in date.'
    if (!emergencyName.trim() || !NAME_REGEX.test(emergencyName.trim()))
      errors.emergencyName = 'Emergency contact name must only contain letters.'
    if (!emergencyPhone.trim() || !isValidPhone(emergencyPhone))
      errors.emergencyPhone = 'Enter a valid PH phone number (e.g. 09123456789).'
    return errors
  }

  if (!isOpen || !room) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Run client-side validation first
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      if (!currentUser) {
        throw new Error('You must be logged in to submit an application.')
      }

      // 1. Fetch public.users record matching auth_id
      let { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', currentUser.id)
        .maybeSingle()

      // Auto-create public.users record if missing for this account
      if (!userData) {
        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({
            auth_id: currentUser.id,
            role_id: 4, // Applicant
            name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
            email: currentUser.email
          })
          .select('id')
          .single()

        if (createErr) throw createErr
        userData = newUser
      }

      // 2. BUG-08: Verify the room is still Available before submitting
      const { data: roomCheck, error: roomCheckErr } = await supabase
        .from('rooms')
        .select('status')
        .eq('id', room.id)
        .single()

      if (roomCheckErr) throw roomCheckErr
      if (!roomCheck || roomCheck.status?.toLowerCase() !== 'available') {
        setErrorMsg('Sorry, this room is no longer available. Please browse other rooms.')
        setLoading(false)
        return
      }

      // 3. BUG-02 / BUG-07: Block duplicate applications (Pending or already Approved)
      const { data: existingApp } = await supabase
        .from('rental_applications')
        .select('id, status')
        .eq('user_id', userData.id)
        .eq('room_id', room.id)
        .in('status', ['Pending', 'Approved'])
        .maybeSingle()

      if (existingApp) {
        const msg = existingApp.status === 'Approved'
          ? 'You have already been approved for this room.'
          : 'You already have a pending application for this room. Please wait for the landlord to review it.'
        setErrorMsg(msg)
        setLoading(false)
        return
      }

      // 4. Insert into public.rental_applications
      const { data: appData, error: appError } = await supabase
        .from('rental_applications')
        .insert({
          user_id: userData.id,
          room_id: room.id,
          move_in_date: moveInDate,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          message: message,
          status: 'Pending'
        })
        .select()

      if (appError) throw appError

      // 5. Log security audit event
      await supabase.from('audit_logs').insert({
        user_id: userData.id,
        action: 'CREATE_APPLICATION',
        target_type: 'RENTAL_APPLICATIONS',
        target_id: appData[0]?.id || null,
        description: `Boarder submitted rental application for ${room.name}`
      })

      // Notify all landlords of the new application
      await notifyLandlords(
        '📄 New Rental Application',
        `${currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]} applied for ${room.name}. Review it in the Applications section.`,
        'new_application'
      )

      setSuccessMsg('Rental application submitted successfully! Landlord will review your request.')
      setTimeout(() => {
        onApplicationSubmitted()
        onClose()
      }, 1500)
    } catch (err) {
      logError('RentalApplicationModal.handleSubmit', err)
      setErrorMsg(sanitizeError(err, 'application'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '520px', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="modal-header" style={{ marginBottom: '20px' }}>
          <h2>Rental Application</h2>
          <p>Apply for <strong>{room.name}</strong> (₱{Number(room.price).toLocaleString()}/mo)</p>
        </div>

        {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}
        {successMsg && (
          <div className="alert-message alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Target Room Preview Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
            <img 
              src={room.image || room.image_url} 
              alt={room.name} 
              style={{ width: '60px', height: '50px', objectFit: 'cover', borderRadius: '6px' }}
            />
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{room.name}</h4>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {room.type?.toUpperCase()} • {room.capacity || '1 Person'} • ₱{Number(room.price).toLocaleString()}/month
              </p>
            </div>
          </div>

          {/* Requested Move-in Date */}
          <div className="form-group">
            <label>Desired Move-in Date *</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                style={{ paddingLeft: '38px', borderColor: fieldErrors.moveInDate ? '#dc2626' : undefined }}
                value={moveInDate}
                onChange={(e) => { setMoveInDate(e.target.value); clearFieldError('moveInDate') }}
              />
            </div>
            {fieldErrors.moveInDate && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> {fieldErrors.moveInDate}
              </p>
            )}
          </div>

          {/* Emergency Contact Name & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Emergency Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Emergency Contact Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Parent / Guardian Name"
                  required
                  style={{ paddingLeft: '38px', borderColor: fieldErrors.emergencyName ? '#dc2626' : undefined }}
                  value={emergencyName}
                  onChange={handleEmergencyNameChange}
                />
              </div>
              {fieldErrors.emergencyName && (
                <p style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '3px', lineHeight: 1.4 }}>
                  <XCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} /> {fieldErrors.emergencyName}
                </p>
              )}
            </div>

            {/* Emergency Phone */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Emergency Phone *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="tel"
                  placeholder="09123456789"
                  required
                  maxLength={15}
                  style={{ paddingLeft: '38px', borderColor: fieldErrors.emergencyPhone ? '#dc2626' : undefined }}
                  value={emergencyPhone}
                  onChange={handleEmergencyPhoneChange}
                />
              </div>
              {fieldErrors.emergencyPhone && (
                <p style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '3px', lineHeight: 1.4 }}>
                  <XCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} /> {fieldErrors.emergencyPhone}
                </p>
              )}
            </div>
          </div>

          {/* Additional Notes for Landlord */}
          <div className="form-group">
            <label>Notes / Message for Landlord (Optional)</label>
            <div className="input-icon-wrap" style={{ position: 'relative' }}>
              <MessageSquare size={16} style={{ position: 'absolute', left: '12px', top: '16px', color: '#64748b' }} />
              <textarea
                rows={3}
                placeholder="Let the landlord know any special requests or questions..."
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem'
                }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
