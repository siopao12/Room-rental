import React, { useState, useEffect } from 'react'
import { User, Mail, Lock, Loader2, CheckCircle2, Eye, EyeOff, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { decryptObject } from '../../../lib/encryptionHelper'
import { sanitizeError, logError } from '../../../lib/errorHandler'

export default function ProfileSection({ currentUser }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' })
  const [pwFieldErrors, setPwFieldErrors] = useState({})

  const PW_RULES = [
    { id: 'length',  label: 'At least 8 characters',         test: (p) => p.length >= 8 },
    { id: 'upper',   label: 'At least one uppercase letter',  test: (p) => /[A-Z]/.test(p) },
    { id: 'number',  label: 'At least one number',            test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'At least one special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ]

  function getStrengthLevel(pw) {
    if (!pw) return 0
    return PW_RULES.filter(r => r.test(pw)).length
  }

  const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

  useEffect(() => {
    fetchProfile()
  }, [currentUser])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('users')
        .select('*, roles(*)')
        .eq('auth_id', currentUser.id)
        .single()

      if (data) {
        const decrypted = decryptObject(data, ['phone', 'emergency_contact'])
        setProfile(decrypted)
        setForm({ name: decrypted.name || '', email: decrypted.email || currentUser.email })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  // Validation Regexes
  const NAME_REGEX = /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\s'\-]+$/
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

  const [profileFieldErrors, setProfileFieldErrors] = useState({})

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')
    setProfileFieldErrors({})

    const fieldErrors = {}
    if (!form.name.trim()) {
      fieldErrors.name = 'Full name is required.'
    } else if (!NAME_REGEX.test(form.name.trim())) {
      fieldErrors.name = 'Name must only contain letters, spaces, hyphens, or apostrophes.'
    }

    if (!form.email.trim()) {
      fieldErrors.email = 'Email address is required.'
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      fieldErrors.email = 'Please enter a valid email address.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setProfileFieldErrors(fieldErrors)
      setSaving(false)
      return
    }

    try {
      const trimmedEmail = form.email.trim()
      const currentAuthEmail = currentUser?.email || profile?.email || ''
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

      const { error: dbErr } = await supabase
        .from('users')
        .update({ name: form.name.trim(), email: trimmedEmail })
        .eq('auth_id', currentUser.id)
      if (dbErr) throw dbErr

      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'UPDATE_PROFILE',
        target_type: 'USERS',
        description: `Landlord updated profile name to: ${form.name.trim()}${emailChanged ? ` and email to: ${trimmedEmail}` : ''}`
      })

      if (emailChanged) {
        setSuccessMsg('Profile updated! If email confirmation is enabled, check your new inbox to complete verification.')
      } else {
        setSuccessMsg('Profile updated successfully!')
      }
      setTimeout(() => setSuccessMsg(''), 5000)
      fetchProfile()
    } catch (err) {
      logError('ProfileSection.handleSaveProfile', err)
      setErrorMsg(sanitizeError(err, 'profile'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdMsg({ type: '', text: '' })
    setPwFieldErrors({})

    const fieldErrs = {}
    if (!currentPassword) {
      fieldErrs.currentPassword = 'Current password is required.'
    }

    const failedRules = PW_RULES.filter(r => !r.test(newPassword))
    if (newPassword && failedRules.length > 0) {
      fieldErrs.newPassword = `Missing: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`
    } else if (!newPassword) {
      fieldErrs.newPassword = 'New password is required.'
    }

    if (!confirmPassword) {
      fieldErrs.confirmPassword = 'Please confirm your new password.'
    } else if (newPassword && newPassword !== confirmPassword) {
      fieldErrs.confirmPassword = 'Passwords do not match.'
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      fieldErrs.newPassword = 'New password must be different from your current password.'
    }

    if (Object.keys(fieldErrs).length > 0) {
      setPwFieldErrors(fieldErrs)
      return
    }

    setChangingPwd(true)
    try {
      // Step 1: Re-authenticate to verify current credentials securely
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      })
      if (signInError) {
        setPwFieldErrors({ currentPassword: 'Current password is incorrect. Please try again.' })
        return
      }

      // Step 2: Update password in Auth
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      try {
        await supabase.from('audit_logs').insert({
          user_id: profile?.id,
          action: 'UPDATE_PASSWORD',
          target_type: 'USERS',
          target_id: profile?.id,
          description: 'Landlord updated account password securely.'
        })
      } catch (_) { }

      setPwdMsg({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwFieldErrors({})
      setTimeout(() => setPwdMsg({ type: '', text: '' }), 4000)
    } catch (err) {
      logError('ProfileSection.handleChangePassword', err)
      setPwdMsg({ type: 'error', text: sanitizeError(err, 'auth') })
    } finally {
      setChangingPwd(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
        <Loader2 size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
        Loading profile...
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>My Profile</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
          Update your landlord account information
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Profile Info Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '2rem',
              boxShadow: '0 8px 24px rgba(45, 106, 79, 0.25)'
            }}>
              {(profile?.name || currentUser?.email || 'L')[0].toUpperCase()}
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0f172a' }}>{profile?.name || 'Landlord'}</h3>
            <span style={{
              display: 'inline-block', marginTop: '6px', padding: '4px 14px',
              borderRadius: '20px', background: '#1b4332', color: '#fff',
              fontSize: '0.75rem', fontWeight: 700
            }}>
              {profile?.roles?.name || 'Landlord'}
            </span>
          </div>

          <form onSubmit={handleSaveProfile}>
            {successMsg && <div className="alert-message alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle2 size={15} />{successMsg}</div>}
            {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }))
                    setProfileFieldErrors(p => { const n = { ...p }; delete n.name; return n })
                  }}
                  placeholder="Your full name"
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>
              {profileFieldErrors.name && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={12} /> {profileFieldErrors.name}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => {
                    setForm(f => ({ ...f, email: e.target.value }))
                    setProfileFieldErrors(p => { const n = { ...p }; delete n.email; return n })
                  }}
                  placeholder="Your email address"
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
              </div>
              {profileFieldErrors.email && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={12} /> {profileFieldErrors.email}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
              Save Profile
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#2d6a4f" /> Change Password
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>
            Update your account password securely.
          </p>

          <form onSubmit={handleChangePassword}>
            {pwdMsg.text && (
              <div className={`alert-message ${pwdMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                {pwdMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {pwdMsg.text}
              </div>
            )}

            {/* Current Password */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => {
                    setCurrentPassword(e.target.value)
                    setPwFieldErrors(p => { const n = { ...p }; delete n.currentPassword; return n })
                  }}
                  style={{ paddingLeft: '38px', paddingRight: '40px', width: '100%' }}
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwFieldErrors.currentPassword && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={12} /> {pwFieldErrors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="At least 8 chars, uppercase, number & symbol"
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value)
                    setPwFieldErrors(p => { const n = { ...p }; delete n.newPassword; return n })
                  }}
                  style={{ paddingLeft: '38px', paddingRight: '40px', width: '100%' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength meter */}
              {newPassword && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
                    <span>Strength</span>
                    <span style={{ fontWeight: 700, color: STRENGTH_COLORS[getStrengthLevel(newPassword)] }}>
                      {STRENGTH_LABELS[getStrengthLevel(newPassword)]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                    {[1, 2, 3, 4].map(num => (
                      <div
                        key={num}
                        style={{
                          flex: 1, borderRadius: '2px',
                          background: num <= getStrengthLevel(newPassword) ? STRENGTH_COLORS[getStrengthLevel(newPassword)] : '#e2e8f0',
                          transition: 'all 0.2s'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Password rules checklist */}
              {newPassword && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: '10px' }}>
                  {PW_RULES.map(rule => {
                    const passed = rule.test(newPassword)
                    return (
                      <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: passed ? '#166534' : '#64748b' }}>
                        {passed ? <CheckCircle2 size={12} color="#166534" /> : <XCircle size={12} color="#94a3b8" />}
                        {rule.label}
                      </div>
                    )
                  })}
                </div>
              )}

              {pwFieldErrors.newPassword && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={12} /> {pwFieldErrors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value)
                    setPwFieldErrors(p => { const n = { ...p }; delete n.confirmPassword; return n })
                  }}
                  style={{ paddingLeft: '38px', paddingRight: '40px', width: '100%' }}
                />
                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwFieldErrors.confirmPassword && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={12} /> {pwFieldErrors.confirmPassword}
                </p>
              )}
              {/* Live match indicator */}
              {confirmPassword && newPassword && !pwFieldErrors.confirmPassword && (
                <p style={{ fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px', color: confirmPassword === newPassword ? '#166534' : '#dc2626' }}>
                  {confirmPassword === newPassword
                    ? <><CheckCircle2 size={12} color="#166534" /> Passwords match</>
                    : <><XCircle size={12} color="#dc2626" /> Passwords do not match</>}
                </p>
              )}
            </div>

            <div style={{
              background: '#f8fafc', borderRadius: '8px', padding: '10px 14px',
              fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6, marginBottom: '16px'
            }}>
              🔒 Your current password is required to verify your identity before changing it.
              New password must be at least 8 characters and include an uppercase letter, a number, and a special character.
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={changingPwd || !currentPassword || !newPassword || !confirmPassword}
            >
              {changingPwd ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
