import React, { useState } from 'react'
import { X, Mail, Lock, User, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { sanitizeError, logError } from '../lib/errorHandler'

// ─── Validation Helpers ───────────────────────────────────────────────────────

/** Only letters, spaces, hyphens, and apostrophes — no digits or symbols */
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/

/** RFC 5322-inspired email regex — stricter than browser's built-in type="email" */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

/** Password strength rules */
const PW_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'At least one number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least one special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

function getStrengthLevel(pw) {
  if (!pw) return 0
  return PW_RULES.filter(r => r.test(pw)).length // 0–4
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']


// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialTab = 'login',
  initialSuccessMsg = ''
}) {
  const [tab, setTab] = useState(initialTab)

  // Registration name fields
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [suffix, setSuffix] = useState('')

  // Account credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Show/Hide password toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Per-field inline error messages
  const [fieldErrors, setFieldErrors] = useState({})

  // Status & loading
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState(initialSuccessMsg)

  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) setTab(initialTab)
      if (initialSuccessMsg) setSuccessMsg(initialSuccessMsg)
    }
  }, [isOpen, initialTab, initialSuccessMsg])

  if (!isOpen) return null

  const strengthLevel = getStrengthLevel(password)

  const resetFormState = () => {
    setErrorMsg('')
    setSuccessMsg('')
    setPassword('')
    setConfirmPassword('')
    setFieldErrors({})
  }

  // ── Per-field change handlers with inline validation ──────────────────────

  const clearFieldError = (key) =>
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })

  const handleNameChange = (setter, key) => (e) => {
    const val = e.target.value
    setter(val)
    if (val && !NAME_REGEX.test(val)) {
      setFieldErrors(prev => ({ ...prev, [key]: 'Only letters, spaces, hyphens, or apostrophes are allowed.' }))
    } else {
      clearFieldError(key)
    }
  }

  const handleEmailChange = (e) => {
    const val = e.target.value
    setEmail(val)
    if (val && !EMAIL_REGEX.test(val)) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g. name@example.com).' }))
    } else {
      clearFieldError('email')
    }
  }

  const handlePasswordChange = (e) => {
    setPassword(e.target.value)
    clearFieldError('password')
  }

  // ── Client-side validation gate ───────────────────────────────────────────

  const validateRegister = () => {
    const errors = {}
    if (!firstName.trim() || !NAME_REGEX.test(firstName.trim()))
      errors.firstName = 'First name must only contain letters.'
    if (!lastName.trim() || !NAME_REGEX.test(lastName.trim()))
      errors.lastName = 'Last name must only contain letters.'
    if (middleName.trim() && !NAME_REGEX.test(middleName.trim()))
      errors.middleName = 'Middle name must only contain letters.'
    if (!EMAIL_REGEX.test(email.trim()))
      errors.email = 'Please enter a valid email address (e.g. name@example.com).'
    const failedRules = PW_RULES.filter(r => !r.test(password))
    if (failedRules.length > 0)
      errors.password = `Password is too weak. Missing: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`
    if (password !== confirmPassword)
      errors.confirmPassword = 'Passwords do not match. Please re-enter.'
    return errors
  }

  const validateLogin = () => {
    const errors = {}
    if (!EMAIL_REGEX.test(email.trim()))
      errors.email = 'Please enter a valid email address.'
    if (!password)
      errors.password = 'Password is required.'
    return errors
  }

  // ── Submit Handlers ───────────────────────────────────────────────────────

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!EMAIL_REGEX.test(email.trim())) {
      setFieldErrors({ email: 'Please enter a valid email address.' })
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`
      })
      if (error) throw error
      setSuccessMsg('A password reset link has been sent to your email! Please check your inbox.')
    } catch (err) {
      logError('AuthModal.handleForgotPassword', err)
      setErrorMsg(sanitizeError(err, 'auth'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (tab === 'forgot') return handleForgotPassword(e)

    setErrorMsg('')
    setSuccessMsg('')

    const validationErrors = tab === 'login' ? validateLogin() : validateRegister()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error

        // Block deactivated accounts from logging in
        const { data: profile } = await supabase
          .from('users')
          .select('is_active')
          .eq('auth_id', data.user.id)
          .maybeSingle()

        if (profile && profile.is_active === false) {
          await supabase.auth.signOut()
          setErrorMsg('Your account has been deactivated by an Administrator. Please contact support.')
          return
        }

        setSuccessMsg('Successfully logged in!')
        setTimeout(() => { onAuthSuccess(data.user); onClose() }, 300)
      } else {
        const assembledFullName = [firstName.trim(), middleName.trim(), lastName.trim(), suffix.trim()]
          .filter(Boolean).join(' ')

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: assembledFullName },
            emailRedirectTo: `${window.location.origin}/`
          }
        })

        if (error) throw error

        if (!data.user || !data.user.identities || data.user.identities.length === 0) {
          setErrorMsg('An account with this email address already exists. Please sign in instead.')
          setTab('login')
          return
        }

        if (data.session && data.user?.confirmed_at) {
          setSuccessMsg('Account created and logged in!')
          setTimeout(() => { onAuthSuccess(data.user); onClose() }, 350)
        } else {
          if (data.session) {
            await supabase.auth.signOut()
          }
          setSuccessMsg('Account registered successfully! Please check your email to verify your account before logging in.')
          setTab('login')
        }
      }
    } catch (err) {
      logError('AuthModal.handleSubmit', err)
      setErrorMsg(sanitizeError(err, 'auth'))
    } finally {
      setLoading(false)
    }
  }

  // ── Small reusable helpers ────────────────────────────────────────────────

  const FieldError = ({ field }) =>
    fieldErrors[field] ? (
      <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <XCircle size={12} /> {fieldErrors[field]}
      </p>
    ) : null

  const eyeBtnStyle = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center'
  }

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: tab === 'register' ? '540px' : '440px',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          transition: 'all 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="modal-header">
          <h2>{tab === 'forgot' ? 'Reset Password' : 'RoomEase Portal'}</h2>
          <p>{tab === 'forgot' ? 'Enter your registered email to receive a password reset link.' : 'Sign in or create an account to get started.'}</p>
        </div>

        {tab !== 'forgot' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); resetFormState() }}>
              Sign In
            </button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); resetFormState() }}>
              Create Account
            </button>
          </div>
        )}

        {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}
        {successMsg && <div className="alert-message alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Registration Name Fields ── */}
          {tab === 'register' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '4px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>First Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Juan"
                      required
                      style={{ paddingLeft: '38px', borderColor: fieldErrors.firstName ? '#dc2626' : undefined }}
                      value={firstName}
                      onChange={handleNameChange(setFirstName, 'firstName')}
                    />
                  </div>
                  <FieldError field="firstName" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Middle Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Santos (Optional)"
                      style={{ paddingLeft: '38px', borderColor: fieldErrors.middleName ? '#dc2626' : undefined }}
                      value={middleName}
                      onChange={handleNameChange(setMiddleName, 'middleName')}
                    />
                  </div>
                  <FieldError field="middleName" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px', marginTop: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Last Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Dela Cruz"
                      required
                      style={{ paddingLeft: '38px', borderColor: fieldErrors.lastName ? '#dc2626' : undefined }}
                      value={lastName}
                      onChange={handleNameChange(setLastName, 'lastName')}
                    />
                  </div>
                  <FieldError field="lastName" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Suffix</label>
                  <input
                    type="text"
                    placeholder="Jr. / III"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Email Address ── */}
          <div className="form-group">
            <label>Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                placeholder="name@example.com"
                required
                style={{ paddingLeft: '38px', borderColor: fieldErrors.email ? '#dc2626' : undefined }}
                value={email}
                onChange={handleEmailChange}
                autoComplete="email"
              />
            </div>
            <FieldError field="email" />
          </div>

          {/* ── Password ── */}
          {tab !== 'forgot' && (
            <div className="form-group">
              <label>Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  style={{ paddingLeft: '38px', paddingRight: '40px', borderColor: fieldErrors.password ? '#dc2626' : undefined }}
                  value={password}
                  onChange={handlePasswordChange}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle} title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FieldError field="password" />

              {/* Password strength indicator — register only */}
              {tab === 'register' && password && (
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
                      const passed = rule.test(password)
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
          )}

          {/* ── Forgot Password Button on Sign In Tab ── */}
          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-6px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => { setTab('forgot'); resetFormState() }}
                style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* ── Confirm Password (Register only) ── */}
          {tab === 'register' && (
            <div className="form-group">
              <label>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  style={{
                    paddingLeft: '38px', paddingRight: '40px',
                    borderColor: fieldErrors.confirmPassword
                      ? '#dc2626'
                      : confirmPassword && confirmPassword === password ? '#22c55e' : undefined
                  }}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeBtnStyle} title={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FieldError field="confirmPassword" />
              {confirmPassword && password && !fieldErrors.confirmPassword && (
                <p style={{ fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px', color: confirmPassword === password ? '#16a34a' : '#dc2626' }}>
                  {confirmPassword === password
                    ? <><CheckCircle2 size={12} /> Passwords match</>
                    : <><XCircle size={12} /> Passwords do not match</>}
                </p>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Processing...</>
            ) : tab === 'login' ? (
              'Sign In to Account'
            ) : tab === 'register' ? (
              'Create Account'
            ) : (
              'Send Reset Link'
            )}
          </button>

          {tab === 'forgot' && (
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => { setTab('login'); resetFormState() }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
