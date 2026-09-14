import React, { useState, useEffect } from 'react'
import { User, Mail, Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { sanitizeError, logError } from '../../../lib/errorHandler'

export default function ProfileSection({ currentUser }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdError, setPwdError] = useState('')

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
        setProfile(data)
        setForm({ name: data.name || '', email: data.email || currentUser.email })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    if (!form.name.trim()) {
      setErrorMsg('Full name is required.')
      setSaving(false)
      return
    }

    if (!form.email.trim()) {
      setErrorMsg('Email address is required.')
      setSaving(false)
      return
    }

    if (!EMAIL_REGEX.test(form.email.trim())) {
      setErrorMsg('Please enter a valid email address.')
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
            throw new Error('This email address is already registered to another account.')
          }
          throw new Error(authErr.message || 'Failed to update email address in Auth.')
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
    setPwdMsg('')
    setPwdError('')
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters.')
      return
    }
    setChangingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwdMsg('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwdMsg(''), 4000)
    } catch (err) {
      logError('ProfileSection.handleChangePassword', err)
      setPwdError(sanitizeError(err, 'auth'))
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

            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Your email address"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
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
            {pwdMsg && <div className="alert-message alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle2 size={15} />{pwdMsg}</div>}
            {pwdError && <div className="alert-message alert-error">{pwdError}</div>}

            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '38px', paddingRight: '40px' }}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={changingPwd}>
              {changingPwd ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
