import { supabase } from './supabaseClient'
import { encryptData } from './encryptionHelper'

/**
 * notifyHelper.js
 * ─────────────────────────────────────────────────────────────
 * Requires a SECURITY DEFINER RPC in Supabase (run once):
 *
 *   CREATE OR REPLACE FUNCTION get_user_ids_by_role(role_names TEXT[])
 *   RETURNS TABLE(id BIGINT)
 *   LANGUAGE sql SECURITY DEFINER STABLE AS $$
 *     SELECT u.id FROM users u
 *     JOIN roles r ON u.role_id = r.id
 *     WHERE r.name = ANY(role_names)
 *     AND (u.is_active IS NULL OR u.is_active = true);
 *   $$;
 *
 * Why RPC? The users table has RLS — each user can only read their own row.
 * The RPC runs with DB-level privileges to safely return only user IDs.
 * ─────────────────────────────────────────────────────────────
 */

// ─── Core: insert notifications for a list of user IDs ───────────────────────
async function _insertNotifications(userIds, title, message, type) {
  if (!userIds || userIds.length === 0) return

  const rows = userIds.map(id => ({ user_id: id, title, message: encryptData(message), type }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) {
    console.error('[notify] insert error:', error.message, '| code:', error.code)
  }
}

// ─── Core: fetch user IDs for given roles via RPC ────────────────────────────
async function _getUserIdsByRoles(roleNames) {
  try {
    const { data, error } = await supabase
      .rpc('get_user_ids_by_role', { role_names: roleNames })

    if (!error && data) {
      return (data || []).map(row => row.id)
    }
  } catch (_) { }

  // Fallback: Direct database query if RPC is not installed in Supabase
  try {
    const { data: roleData } = await supabase.from('roles').select('id, name').in('name', roleNames)
    if (roleData && roleData.length > 0) {
      const roleIds = roleData.map(r => r.id)
      const { data: usersData } = await supabase
        .from('users')
        .select('id')
        .in('role_id', roleIds)
        .or('is_active.is.null,is_active.eq.true')
      return (usersData || []).map(u => u.id)
    }
  } catch (err) {
    console.error('[notify] Fallback query error:', err)
  }
  return []
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify a single specific user (by their users.id).
 * Use for: application approved/rejected, bill generated, payment verified, etc.
 */
export async function createNotification(userId, title, message, type = 'info') {
  if (!userId) return
  const { error } = await supabase.from('notifications').insert({
    user_id: userId, title, message: encryptData(message), type,
  })
  if (error) console.error('[notify] createNotification error:', error.message)
}

/**
 * Notify ONLY Landlord role users.
 * Use for: new rental application submitted, boarder submitted payment proof.
 * ⚠️  Does NOT notify Admins — use notifyAdmins() separately if needed.
 */
export async function notifyLandlords(title, message, type = 'info') {
  const ids = await _getUserIdsByRoles(['Landlord'])
  await _insertNotifications(ids, title, message, type)
}

/**
 * Notify ONLY Admin role users.
 * Use for: system events, security alerts, etc.
 */
export async function notifyAdmins(title, message, type = 'info') {
  const ids = await _getUserIdsByRoles(['Admin'])
  await _insertNotifications(ids, title, message, type)
}

/**
 * Notify Landlords AND Admins.
 * Use sparingly — only for events both roles genuinely need to know about.
 */
export async function notifyLandlordsAndAdmins(title, message, type = 'info') {
  const ids = await _getUserIdsByRoles(['Landlord', 'Admin'])
  await _insertNotifications(ids, title, message, type)
}

/**
 * Notify ALL Boarder role users (broadcast).
 * Use for: new announcements posted by landlord.
 */
export async function notifyAllBoarders(title, message, type = 'info') {
  const ids = await _getUserIdsByRoles(['Boarder'])
  await _insertNotifications(ids, title, message, type)
}
