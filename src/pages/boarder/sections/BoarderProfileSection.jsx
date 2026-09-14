import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Lock, Save, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, XCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

// ─── Validation Helpers ───────────────────────────────────────────────────────

/** Only letters, spaces, hyphens, and apostrophes — no digits */
const NAME_REGEX = /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\s'\-]+$/

/** Standard Email validation regex */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

/** PH phone validation — accepts 09XXXXXXXXX, +639XXXXXXXXX, landlines */
const PHONE_REGEX = /^(\+63|0)?(9\d{9}|[2-8]\d{6,9})$/
function isValidPhone(val) {
  return PHONE_REGEX.test(val.replace(/[\s\-().]/g, ''))
}

/** Password strength rules — same as AuthModal */
const PW_RULES = [
  { id: 'length',  label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'At least one uppercase letter',  test: (p) => /[A-Z]/.test(p) },
  { id: 'number',  label: 'At least one number',            test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least one special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

function getStrengthLevel(pw) {
  if (!pw) return 0
  return PW_RULES.filter(r => r.test(pw)).length // 0–4
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

// ─── InputField — defined OUTSIDE the parent component so React never
//     sees it as a new type on re-render (prevents the focus-loss bug).
// ─────────────────────────────────────────────────────────────────────────────
function InputField({ label, icon, type = 'text', value, onChange, disabled, placeholder, suffix }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            width: '100%',
            paddingLeft: '38px',
            paddingRight: suffix ? '42px' : '14px',
            background: disabled ? '#f8fafc' : '#fff',
          }}
        />
        {suffix && (
          <button
            type="button"
            onClick={suffix.onClick}
            style={{
              position: 'absolute', right: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center'
            }}
          >
            {suffix.icon}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BoarderProfileSection({ currentUser, userProfile }) {
  const [name, setName]   = useState(userProfile?.name || '')
  const [email, setEmail] = useState(currentUser?.email || userProfile?.email || '')
  const [phone, setPhone] = useState(userProfile?.phone || '')
  const [saving, setSaving]     = useState(false)
  const [profileMsg, setProfileMsg]             = useState({ type: '', text: '' })
  const [profileFieldErrors, setProfileFieldErrors] = useState({})

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showPw, setShowPw]               = useState(false)
  const [changingPw, setChangingPw]       = useState(false)
  const [pwMsg, setPwMsg]                 = useState({ type: '', text: '' })
  const [pwFieldErrors, setPwFieldErrors] = useState({})

  useEffect(() => {
    setName(userProfile?.name || '')
    setEmail(currentUser?.email || userProfile?.email || '')
    setPhone(userProfile?.phone || '')
  }, [userProfile, currentUser])

  // ── Profile Save ──────────────────────────────────────────────────────────

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setProfileMsg({ type: '', text: '' })
    setProfileFieldErrors({})

    const fieldErrors = {}
    if (!name.trim()) {
      fieldErrors.name = 'Full name is required.'
    } else if (!NAME_REGEX.test(name.trim())) {
      fieldErrors.name = 'Name must only contain letters, spaces, hyphens, or apostrophes.'
    }

    if (!email.trim()) {
      fieldErrors.email = 'Email address is required.'
    } else if (!EMAIL_REGEX.test(email.trim())) {
      fieldErrors.email = 'Please enter a valid email address.'
    }

    if (phone.trim() && !isValidPhone(phone)) {
      fieldErrors.phone = 'Enter a valid PH phone number (e.g. 09123456789).'
    }
    if (Object.keys(fieldErrors).length > 0) {
      setProfileFieldErrors(fieldErrors)
      setSaving(false)
      return
    }

    try {
      const trimmedEmail = email.trim()
      const currentAuthEmail = currentUser?.email || userProfile?.email || ''
      let emailChanged = false

      if (trimmedEmail.toLowerCase() !== currentAuthEmail.toLowerCase()) {
        emailChanged = true
        const { error: authErr } = await supabase.auth.updateUser({ email: trimmedEmail })
        if (authErr) {
          if (authErr.message?.toLowerCase().includes('already registered')) {
            setProfileFieldErrors({ email: 'This email address is already registered to another account.' })
          } else {
            setProfileFieldErrors({ email: authErr.message || 'Failed to update email address in Auth.' })
          }
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('users')
        .update({ name: name.trim(), email: trimmedEmail, phone: phone.trim() })
        .eq('auth_id', currentUser.id)
      if (error) throw error

      await supabase.auth.updateUser({ data: { full_name: name.trim() } })

      if (emailChanged) {
        setProfileMsg({
          type: 'success',
          text: 'Profile updated! A verification link may have been sent to your new email address to complete the change.'
        })
      } else {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Password Change ───────────────────────────────────────────────────────

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwMsg({ type: '', text: '' })
    setPwFieldErrors({})

    // ─ Build per-field errors ─
    const fieldErrs = {}
    if (!currentPassword)
      fieldErrs.currentPassword = 'Current password is required.'
    const failedRules = PW_RULES.filter(r => !r.test(newPassword))
    if (newPassword && failedRules.length > 0)
      fieldErrs.newPassword = `Missing: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`
    else if (!newPassword)
      fieldErrs.newPassword = 'New password is required.'
    if (!confirmPassword)
      fieldErrs.confirmPassword = 'Please confirm your new password.'
    else if (newPassword && newPassword !== confirmPassword)
      fieldErrs.confirmPassword = 'Passwords do not match.'
    if (currentPassword && newPassword && currentPassword === newPassword)
      fieldErrs.newPassword = 'New password must be different from your current password.'

    if (Object.keys(fieldErrs).length > 0) {
      setPwFieldErrors(fieldErrs)
      return
    }

    setChangingPw(true)
    try {
      // Step 1: Re-authenticate to verify current credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      })
      if (signInError) {
        setPwFieldErrors({ currentPassword: 'Current password is incorrect. Please try again.' })
        return
      }

      // Step 2: Update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPwMsg({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwFieldErrors({})
    } catch {
      setPwMsg({ type: 'error', text: 'Failed to change password. Please try again.' })
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Profile</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
          Manage your personal information and account settings
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderRadius: '16px', padding: '24px', color: '#fff', gridColumn: 'span 2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px', flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '1.5rem', fontWeight: 800,
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)'
            }}>
              {(userProfile?.name || currentUser?.email || 'B')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{userProfile?.name || '—'}</div>
              <div style={{ color: '#a5b4fc', fontSize: '0.875rem', marginTop: '2px' }}>{currentUser?.email}</div>
              <span style={{
                display: 'inline-block', marginTop: '6px',
                background: 'rgba(165, 180, 252, 0.15)', color: '#a5b4fc',
                padding: '3px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700
              }}>
                {userProfile?.roles?.name || 'Boarder'}
              </span>
            </div>
          </div>
        </div>

        <div style={{
          background: '#fff', borderRadius: '16px', padding: '24px',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5'
            }}>
              <User size={18} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Personal Information</h3>
          </div>

          {profileMsg.text && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.875rem',
              background: profileMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color:      profileMsg.type === 'success' ? '#166534'  : '#991b1b',
              border: `1px solid ${profileMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <InputField
              label="Full Name"
              icon={<User size={15} />}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
            />
            {profileFieldErrors.name && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> {profileFieldErrors.name}
              </p>
            )}

            <InputField
              label="Email Address"
              type="email"
              icon={<Mail size={15} />}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
            />
            {profileFieldErrors.email && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> {profileFieldErrors.email}
              </p>
            )}

            <InputField
              label="Phone Number"
              icon={<Phone size={15} />}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 09123456789"
            />
            {profileFieldErrors.phone && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> {profileFieldErrors.phone}
              </p>
            )}

            <InputField
              label="Role"
              icon={<User size={15} />}
              value={userProfile?.roles?.name || 'Boarder'}
              disabled
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div style={{
          background: '#fff', borderRadius: '16px', padding: '24px',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e'
            }}>
              <Lock size={18} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Change Password</h3>
          </div>

          {pwMsg.text && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.875rem',
              background: pwMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color:      pwMsg.type === 'success' ? '#166534'  : '#991b1b',
              border: `1px solid ${pwMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {pwMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {pwMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── Current Password ── */}
            <InputField
              label="Current Password"
              icon={<Lock size={15} />}
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setPwFieldErrors(p => { const n={...p}; delete n.currentPassword; return n }) }}
              placeholder="Enter your current password"
              suffix={{
                icon: showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />,
                onClick: () => setShowCurrentPw(p => !p)
              }}
            />
            {pwFieldErrors.currentPassword && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> {pwFieldErrors.currentPassword}
              </p>
            )}

            {/* ── New Password + strength bar ── */}
            <InputField
              label="New Password"
              icon={<Lock size={15} />}
              type={showPw ? 'text' : 'password'}
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPwFieldErrors(p => { const n={...p}; delete n.newPassword; return n }) }}
              placeholder="Min. 8 chars, uppercase, number, symbol"
              suffix={{
                icon: showPw ? <EyeOff size={15} /> : <Eye size={15} />,
                onClick: () => setShowPw(p => !p)
              }}
            />
            {pwFieldErrors.newPassword && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> {pwFieldErrors.newPassword}
              </p>
            )}
            {/* Live strength bar — shown while typing */}
            {newPassword && (() => {
              const lvl = getStrengthLevel(newPassword)
              return (
                <div style={{ marginTop: '-6px' }}>
                  {/* Segmented bar */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                    {[1,2,3,4].map(seg => (
                      <div key={seg} style={{
                        flex: 1, height: '4px', borderRadius: '4px',
                        background: seg <= lvl ? STRENGTH_COLORS[lvl] : '#e2e8f0',
                        transition: 'background 0.2s'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: STRENGTH_COLORS[lvl] }}>
                    {STRENGTH_LABELS[lvl]}
                  </span>
                  {/* Rule checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '5px' }}>
                    {PW_RULES.map(rule => {
                      const passed = rule.test(newPassword)
                      return (
                        <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: passed ? '#16a34a' : '#94a3b8' }}>
                          {passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {rule.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* ── Confirm New Password + match indicator ── */}
            <InputField
              label="Confirm New Password"
              icon={<Lock size={15} />}
              type={showPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPwFieldErrors(p => { const n={...p}; delete n.confirmPassword; return n }) }}
              placeholder="Repeat new password"
            />
            {pwFieldErrors.confirmPassword && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> {pwFieldErrors.confirmPassword}
              </p>
            )}
            {/* Live match indicator */}
            {confirmPassword && newPassword && !pwFieldErrors.confirmPassword && (
              <p style={{ fontSize: '0.75rem', marginTop: '-8px', display: 'flex', alignItems: 'center', gap: '4px', color: confirmPassword === newPassword ? '#16a34a' : '#dc2626' }}>
                {confirmPassword === newPassword
                  ? <><CheckCircle2 size={12} /> Passwords match</>
                  : <><XCircle size={12} /> Passwords do not match</>}
              </p>
            )}

            <div style={{
              background: '#f8fafc', borderRadius: '8px', padding: '10px 14px',
              fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6
            }}>
              🔒 Your current password is required to verify your identity before changing it.
              New password must be at least 8 characters and include an uppercase letter, a number, and a special character.
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={changingPw || !currentPassword || !newPassword || !confirmPassword}
              style={{
                marginTop: '4px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: 'none'
              }}
            >
              {changingPw ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
              {changingPw ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
