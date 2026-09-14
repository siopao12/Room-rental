import { supabase } from './supabaseClient'

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

  const rows = userIds.map(id => ({ user_id: id, title, message, type }))
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) {
    console.error('[notify] insert error:', error.message, '| code:', error.code)
  }
}

// ─── Core: fetch user IDs for given roles via RPC ────────────────────────────
async function _getUserIdsByRoles(roleNames) {
  const { data, error } = await supabase
    .rpc('get_user_ids_by_role', { role_names: roleNames })

  if (error) {
    console.error('[notify] RPC get_user_ids_by_role error:', error.message)
    return []
  }
  return (data || []).map(row => row.id)
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
    user_id: userId, title, message, type,
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
