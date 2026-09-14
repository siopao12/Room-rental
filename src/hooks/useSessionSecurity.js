import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes of inactivity
const WARNING_BEFORE_MS = 60 * 1000     // 60 seconds warning countdown before termination
const STORAGE_LAST_ACTIVITY = 'roomease_last_activity'
const STORAGE_LOGOUT_EVENT = 'roomease_logout_event'


export function useSessionSecurity({ onSessionExpired, onAccountDeactivated } = {}) {
  const [currentUser, setCurrentUser] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(60)
  const [expiredNotification, setExpiredNotification] = useState(false)
  const [deactivatedNotification, setDeactivatedNotification] = useState(false)

  const isLoggingOutRef = useRef(false)
  const timerRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  // Track the current authenticated user
  useEffect(() => {
    let mounted = true

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        setCurrentUser(session?.user || null)
        if (session?.user) {
          // Initialize last activity timestamp if logged in
          if (!localStorage.getItem(STORAGE_LAST_ACTIVITY)) {
            localStorage.setItem(STORAGE_LAST_ACTIVITY, Date.now().toString())
          }
        }
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setCurrentUser(session?.user || null)
        if (session?.user) {
          localStorage.setItem(STORAGE_LAST_ACTIVITY, Date.now().toString())
          setShowWarning(false)
        } else {
          setShowWarning(false)
          localStorage.removeItem(STORAGE_LAST_ACTIVITY)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Update activity timestamp in local storage
  const recordActivity = useCallback(() => {
    if (!currentUser) return
    const now = Date.now()
    localStorage.setItem(STORAGE_LAST_ACTIVITY, now.toString())
    if (showWarning) {
      setShowWarning(false)
    }
  }, [currentUser, showWarning])

  // Explicit user extension of session
  const stayLoggedIn = useCallback(() => {
    recordActivity()
    setShowWarning(false)
  }, [recordActivity])

  // Log session timeout to audit logs
  const logSessionTimeout = async (user) => {
    if (!user) return
    try {
      // Find internal user ID from users table
      const { data: profile } = await supabase
        .from('users')
        .select('id, name, email, roles(name)')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (profile) {
        await supabase.from('audit_logs').insert({
          user_id: profile.id,
          action: 'SESSION_TIMEOUT',
          target_type: 'AUTH_SESSION',
          target_id: profile.id,
          description: `User session automatically terminated due to inactivity: ${profile.name || profile.email} (${profile.roles?.name || 'User'})`
        })
      }
    } catch (err) {
      console.warn('Could not record session timeout audit log:', err)
    }
  }

  // Terminate session
  const terminateSession = useCallback(async (isAutoTimeout = true) => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    const userToLog = currentUser

    try {
      if (isAutoTimeout && userToLog) {
        await logSessionTimeout(userToLog)
      }

      // Broadcast logout event to other tabs
      localStorage.setItem(STORAGE_LOGOUT_EVENT, Date.now().toString())
      localStorage.removeItem(STORAGE_LAST_ACTIVITY)

      await supabase.auth.signOut()

      setShowWarning(false)
      if (isAutoTimeout) {
        setExpiredNotification(true)
        if (onSessionExpired) {
          onSessionExpired()
        }
      }
    } catch (err) {
      console.error('Error terminating session:', err)
    } finally {
      isLoggingOutRef.current = false
    }
  }, [currentUser, onSessionExpired])

  // Manual logout request
  const logoutNow = useCallback(() => {
    terminateSession(false)
  }, [terminateSession])

  // Active check interval for idle detection
  useEffect(() => {
    if (!currentUser) {
      setShowWarning(false)
      return
    }

    const checkIdleState = () => {
      const stored = localStorage.getItem(STORAGE_LAST_ACTIVITY)
      const lastActive = stored ? parseInt(stored, 10) : Date.now()
      const now = Date.now()
      const timeSinceActive = now - lastActive

      const timeUntilExpiration = IDLE_TIMEOUT_MS - timeSinceActive

      if (timeUntilExpiration <= 0) {
        // Time is up — terminate session
        terminateSession(true)
      } else if (timeUntilExpiration <= WARNING_BEFORE_MS) {
        // Within warning threshold
        setShowWarning(true)
        setRemainingSeconds(Math.max(1, Math.ceil(timeUntilExpiration / 1000)))
      } else {
        setShowWarning(false)
      }
    }

    // Run check every second
    timerRef.current = setInterval(checkIdleState, 1000)

    // Poll for account deactivation every 4 seconds
    let statusCheckInterval = null
    if (currentUser) {
      const checkDeactivated = async () => {
        const { data: profile } = await supabase
          .from('users')
          .select('is_active')
          .eq('auth_id', currentUser.id)
          .maybeSingle()

        if (profile && profile.is_active === false) {
          setDeactivatedNotification(true)
          if (onAccountDeactivated) onAccountDeactivated()
          terminateSession(false)
        }
      }

      checkDeactivated()
      statusCheckInterval = setInterval(checkDeactivated, 4000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (statusCheckInterval) clearInterval(statusCheckInterval)
    }
  }, [currentUser, terminateSession, onAccountDeactivated])

  // User input event listeners to track physical activity (throttled)
  useEffect(() => {
    if (!currentUser) return

    let lastRecorded = 0
    const throttledHandler = () => {
      const now = Date.now()
      if (now - lastRecorded > 3000) { // update at most every 3 seconds
        lastRecorded = now
        recordActivity()
      }
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'click']
    events.forEach(evt => window.addEventListener(evt, throttledHandler, { passive: true }))

    // Listen for storage events (multi-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_LOGOUT_EVENT) {
        // Another tab logged out
        setShowWarning(false)
        supabase.auth.signOut()
      } else if (e.key === STORAGE_LAST_ACTIVITY) {
        // Activity detected in another tab
        setShowWarning(false)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      events.forEach(evt => window.removeEventListener(evt, throttledHandler))
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [currentUser, recordActivity])

  return {
    currentUser,
    showWarning,
    remainingSeconds,
    stayLoggedIn,
    logoutNow,
    expiredNotification,
    dismissExpiredNotification: () => setExpiredNotification(false),
    deactivatedNotification,
    dismissDeactivatedNotification: () => setDeactivatedNotification(false)
  }
}
