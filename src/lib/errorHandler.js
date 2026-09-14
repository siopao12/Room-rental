/**
 * errorHandler.js
 * ─────────────────────────────────────────────────────────────
 * Centralized error sanitization for RoomEase.
 *
 * Purpose (IAS2 Manuscript requirement):
 *   "System errors will be handled appropriately without exposing
 *   sensitive technical information such as database credentials,
 *   server details, file paths, or internal system errors."
 *
 * Usage:
 *   import { sanitizeError, logError } from '../lib/errorHandler'
 *   catch (err) {
 *     logError('context', err)              // safe console.warn (dev only)
 *     setErrorMsg(sanitizeError(err, 'auth'))  // safe user-facing message
 *   }
 * ─────────────────────────────────────────────────────────────
 */

// ─── Message Map: raw pattern → safe user message ─────────────────────────────
const ERROR_MAP = [
  // Auth / credentials
  { pattern: /otp_expired|otp expired|email link.*expired/i, msg: 'This password reset link has expired. Please request a new link.' },
  { pattern: /invalid.*token|token.*invalid|unauthorized_client/i, msg: 'This password reset link is invalid or has already been used.' },
  { pattern: /email rate limit exceeded|rate_limit|rate limit|too many requests|429/i, msg: 'The password reset email limit has been reached for this hour. Please wait approximately 1 hour before requesting another link, or contact the administrator for assistance.' },
  { pattern: /invalid login credentials/i,              msg: 'Incorrect email or password. Please try again.' },
  { pattern: /email not confirmed/i,                    msg: 'Please verify your email address before logging in.' },
  { pattern: /user already registered/i,                msg: 'An account with this email already exists. Please log in.' },
  { pattern: /duplicate key.*email/i,                   msg: 'This email address is already registered in the system.' },
  { pattern: /duplicate key.*users_email_key/i,         msg: 'This email address is already registered in the system.' },
  { pattern: /duplicate key/i,                          msg: 'A record with these details already exists.' },
  { pattern: /password.*should be at least/i,           msg: 'Password must be at least 8 characters long.' },
  { pattern: /weak password/i,                          msg: 'Your password is too weak. Please choose a stronger password.' },
  { pattern: /same_password|new password should be different|password.*different from.*old|different from the old password/i, msg: 'Your new password must be different from your current password. Please choose a new one.' },
  { pattern: /email.*invalid/i,                         msg: 'Please enter a valid email address.' },

  // Session
  { pattern: /jwt expired/i,                            msg: 'Your session has expired. Please log in again.' },
  { pattern: /jwt.*invalid/i,                           msg: 'Your session is invalid. Please log in again.' },
  { pattern: /not authenticated/i,                      msg: 'You must be logged in to perform this action.' },
  { pattern: /refresh.*token/i,                         msg: 'Your session has expired. Please log in again.' },

  // Authorization / RLS
  { pattern: /new row violates row-level security/i,    msg: 'You do not have permission to perform this action.' },
  { pattern: /permission denied/i,                      msg: 'You do not have permission to perform this action.' },
  { pattern: /row-level security/i,                     msg: 'Access denied. Please check your permissions.' },

  // Network / connectivity
  { pattern: /failed to fetch/i,                        msg: 'Unable to connect to the server. Please check your internet connection.' },
  { pattern: /network.*error/i,                         msg: 'A network error occurred. Please try again.' },
  { pattern: /timeout/i,                                msg: 'The request timed out. Please try again.' },

  // Database constraint
  { pattern: /foreign key.*violates/i,                  msg: 'This operation could not be completed due to a related record conflict.' },
  { pattern: /not-null constraint/i,                    msg: 'Please fill in all required fields before submitting.' },
  { pattern: /violates check constraint/i,              msg: 'The information provided does not meet the required format.' },

  // Generic database / server errors — catch-all to hide schema
  { pattern: /supabase/i,                               msg: 'A system error occurred. Please try again later.' },
  { pattern: /postgres|pg_/i,                           msg: 'A database error occurred. Please contact support if this persists.' },
  { pattern: /sql|query/i,                              msg: 'A data processing error occurred. Please try again.' },
]

// Context-specific fallback messages
const CONTEXT_FALLBACKS = {
  auth:        'Authentication failed. Please try again.',
  profile:     'Unable to update profile. Please try again.',
  room:        'Unable to process room information. Please try again.',
  payment:     'Unable to process payment. Please try again.',
  application: 'Unable to process application. Please try again.',
  export:      'Export failed. Please try again.',
  announcement:'Unable to process announcement. Please try again.',
  fetch:       'Unable to load data. Please refresh the page.',
  default:     'An unexpected error occurred. Please try again later.',
}

/**
 * Sanitizes a raw error into a safe, user-facing message.
 *
 * @param {Error|string|object} err - The raw error caught
 * @param {string} context - Optional context key for fallback (e.g. 'auth', 'payment')
 * @returns {string} Safe user-facing message
 */
export function sanitizeError(err, context = 'default') {
  const raw = typeof err === 'string'
    ? err
    : err?.message || err?.error_description || ''

  // Check against known error patterns
  for (const { pattern, msg } of ERROR_MAP) {
    if (pattern.test(raw)) {
      return msg
    }
  }

  // Return context-specific fallback, never the raw message
  return CONTEXT_FALLBACKS[context] || CONTEXT_FALLBACKS.default
}

/**
 * Safe console logger — logs full details in development only.
 * In production, logs a sanitized summary without sensitive internals.
 *
 * @param {string} context - Human-readable context (e.g. 'PaymentsSection.handleVerify')
 * @param {Error|string|object} err - The raw error
 */
export function logError(context, err) {
  // Always safe to log context to help with debugging
  const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true

  if (isDev) {
    // Full details in dev — useful for debugging schema issues
    console.warn(`[RoomEase Error] ${context}:`, err)
  } else {
    // Sanitized production log — no schema, no stack, no credentials
    console.warn(`[RoomEase] An error occurred in: ${context}`)
  }
}
