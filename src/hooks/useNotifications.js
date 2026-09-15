import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { decryptObject } from '../lib/encryptionHelper'

/**
 * useNotifications — real-time notification hook
 * Fetches notifications for the given user and subscribes to live inserts via Supabase Realtime.
 *
 * @param {object|null} userProfile  — the DB user row (needs userProfile.id)
 */
export function useNotifications(userProfile) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const userId = userProfile?.id

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      const decNotifs = data.map(n => decryptObject(n, ['message']))
      setNotifications(decNotifs)
      setUnreadCount(decNotifs.filter(n => !n.is_read).length)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return

    fetchNotifications()

    // Subscribe to real-time inserts for this user
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const decNew = decryptObject(payload.new, ['message'])
          setNotifications(prev => [decNew, ...prev].slice(0, 50))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchNotifications])

  const markAsRead = useCallback(async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
