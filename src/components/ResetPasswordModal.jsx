import React, { useState } from 'react'
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { sanitizeError, logError } from '../lib/errorHandler'

/** Password strength rules */
const PW_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'At least one number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least one special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

function getStrengthLevel(pw) {
  if (!pw) return 0
  return PW_RULES.filter(r => r.test(pw)).length
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

export default function ResetPasswordModal({ isOpen, onSuccessRedirect }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const strengthLevel = getStrengthLevel(newPassword)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Validation
    const failedRules = PW_RULES.filter(r => !r.test(newPassword))
    if (failedRules.length > 0) {
      setErrorMsg(`Password is too weak. Missing: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`)
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      // Audit log entry
      try {
        if (data?.user?.id) {
          const { data: profile } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('auth_id', data.user.id)
            .maybeSingle()

          await supabase.from('audit_logs').insert({
            user_id: profile?.id || null,
            action: 'RESET_PASSWORD_COMPLETE',
            target_type: 'USERS',
            target_id: profile?.id || null,
            description: `Password successfully updated via reset recovery link for ${data.user.email}`
          })
        }
      } catch (_) { }

      setSuccessMsg('Your password has been updated successfully! Redirecting to your portal...')

      setTimeout(() => {
        // Clear hash from URL
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname)
        }
        if (onSuccessRedirect) onSuccessRedirect()
      }, 1500)
    } catch (err) {
      logError('ResetPasswordModal.handleSubmit', err)
      setErrorMsg(sanitizeError(err, 'auth'))
    } finally {
      setLoading(false)
    }
  }

  const eyeBtnStyle = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center'
  }

  return (
    <div className="modal-overlay active" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', background: '#ede9fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
          }}>
            <KeyRound size={24} color="#6d28d9" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Set New Password</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Please enter and confirm your new password to secure your account.
          </p>
        </div>

        {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}
        {successMsg && <div className="alert-message alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* New Password */}
          <div className="form-group">
            <label>New Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  {[1, 2, 3, 4].map(seg => (
                    <div key={seg} style={{
                      flex: 1, height: '4px', borderRadius: '4px',
                      background: seg <= strengthLevel ? STRENGTH_COLORS[strengthLevel] : '#e2e8f0',
                      transition: 'background 0.25s'
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STRENGTH_COLORS[strengthLevel] }}>
                  {STRENGTH_LABELS[strengthLevel]}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
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
            )}
          </div>

          {/* Confirm New Password */}
          <div className="form-group">
            <label>Confirm New Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeBtnStyle}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && newPassword && (
              <p style={{ fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px', color: confirmPassword === newPassword ? '#16a34a' : '#dc2626' }}>
                {confirmPassword === newPassword
                  ? <><CheckCircle2 size={12} /> Passwords match</>
                  : <><XCircle size={12} /> Passwords do not match</>}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Updating Password...</>
            ) : (
              'Save New Password'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
