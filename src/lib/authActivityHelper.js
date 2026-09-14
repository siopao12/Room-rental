import { supabase } from './supabaseClient'
import { logError } from './errorHandler'

/**
 * authActivityHelper.js
 * ─────────────────────────────────────────────────────────────
 * Centralized logging for user authentication events (Login, Logout)
 * across all roles (Admin, Landlord, Boarder, Applicant).
 *
 * Implements Manuscript Requirement:
 *   "Admin: Monitor user login activities"
 *   "Important system activities will be recorded through an audit trail
 *    to support monitoring, accountability, and security tracking."
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Record user login event in both login_events and audit_logs.
 *
 * @param {object} user - Supabase auth user object
 * @param {object} profile - public.users profile row
 */
export async function recordLoginEvent(user, profile) {
  if (!user) return
  try {
    const roleName = profile?.roles?.name || (typeof profile?.role_name === 'string' ? profile.role_name : 'Applicant')
    const userId = profile?.id || null
    const userEmail = user.email || profile?.email || ''
    const userName = profile?.name || user.user_metadata?.full_name || userEmail.split('@')[0]

    // 1. Insert into login_events
    try {
      await supabase.from('login_events').insert({
        user_id: userId,
        auth_id: user.id,
        email: userEmail,
        role_name: roleName,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser'
      })
    } catch (e) {
      logError('recordLoginEvent.login_events', e)
    }

    // 2. Insert into audit_logs
    if (userId) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'LOGIN',
          target_type: 'AUTH_SESSION',
          target_id: userId,
          description: `${roleName} logged in: ${userName} (${userEmail})`
        })
      } catch (e) {
        logError('recordLoginEvent.audit_logs', e)
      }
    }
  } catch (err) {
    logError('recordLoginEvent', err)
  }
}

/**
 * Record user logout event in audit_logs.
 *
 * @param {object} user - Supabase auth user object
 * @param {object} profile - public.users profile row
 */
export async function recordLogoutEvent(user, profile) {
  if (!user && !profile) return
  try {
    const userId = profile?.id || null
    const userEmail = user?.email || profile?.email || ''
    const userName = profile?.name || user?.user_metadata?.full_name || userEmail.split('@')[0]
    const roleName = profile?.roles?.name || (typeof profile?.role_name === 'string' ? profile.role_name : 'User')

    if (userId) {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'LOGOUT',
        target_type: 'AUTH_SESSION',
        target_id: userId,
        description: `${roleName} signed out: ${userName} (${userEmail})`
      })
    }
  } catch (err) {
    logError('recordLogoutEvent', err)
  }
}
