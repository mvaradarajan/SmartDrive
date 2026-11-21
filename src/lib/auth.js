// Google Identity Services (GIS) token-flow auth with silent refresh.

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CONSENT_KEY = 'smartdrive.hasConsented'
const TOKEN_KEY = 'smartdrive.token'
const EXPIRY_SKEW_MS = 60_000

export const isConfigured = Boolean(CLIENT_ID && !CLIENT_ID.startsWith('your-'))

export class AuthError extends Error {
  constructor(code, message) {
    super(message || `Authentication failed (${code})`)
    this.name = 'AuthError'
    this.code = code
  }
}

/** @typedef {'signedOut' | 'signedIn' | 'expired'} AuthStatus */

let token = null
let expiresAt = 0
let pending = null
/** @type {{ status: AuthStatus, error: string | null }} */
let snapshot = { status: 'signedOut', error: null }
const listeners = new Set()

// Restore a still-valid token after a page reload (sessionStorage only: dies with the tab).
try {
  const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null')
  if (saved && saved.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    token = saved.token
    expiresAt = saved.expiresAt
    snapshot = { status: 'signedIn', error: null }
  }
} catch {
  /* ignore */
}

function setSnapshot(next) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((l) => l())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAuthSnapshot() {
  return snapshot
}

function hasConsented() {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

function waitForGis(timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const start = Date.now()
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer)
        reject(new AuthError('gis_unavailable', 'Google sign-in failed to load. Check your connection.'))
      }
    }, 50)
  })
}

function storeToken(resp) {
  token = resp.access_token
  expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }))
    localStorage.setItem(CONSENT_KEY, '1')
  } catch {
    /* ignore */
  }
}

function requestToken(prompt) {
  if (pending) return pending
  pending = waitForGis()
    .then(
      () =>
        new Promise((resolve, reject) => {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            prompt,
            callback: (resp) => {
              if (resp.error) {
                reject(new AuthError(resp.error, resp.error_description))
                return
              }
              storeToken(resp)
              setSnapshot({ status: 'signedIn', error: null })
              resolve(token)
            },
            error_callback: (err) => {
              reject(new AuthError(err?.type || 'popup_failed', err?.message))
            },
          })
          client.requestAccessToken({ prompt })
        }),
    )
    .finally(() => {
      pending = null
    })
  return pending
}

/** Interactive sign-in (must be called from a user gesture). */
export async function signIn() {
  if (!isConfigured) throw new AuthError('not_configured', 'VITE_GOOGLE_CLIENT_ID is not set.')
  try {
    return await requestToken(hasConsented() ? '' : 'consent')
  } catch (err) {
    setSnapshot({ error: err.message })
    throw err
  }
}

/** Drops the in-memory token so the next getToken() refreshes. */
export function invalidateToken() {
  token = null
  expiresAt = 0
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Returns a valid access token, silently refreshing when close to expiry.
 * If silent refresh fails, the session is flagged as expired so the UI can prompt a reconnect.
 */
export async function getToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && token && expiresAt - EXPIRY_SKEW_MS > Date.now()) return token
  if (snapshot.status === 'signedOut') throw new AuthError('signed_out', 'Not signed in.')
  try {
    return await requestToken('')
  } catch (err) {
    invalidateToken()
    setSnapshot({ status: 'expired', error: 'Your Google session expired. Reconnect to continue.' })
    throw err
  }
}

export function signOut() {
  const current = token
  invalidateToken()
  if (current && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(current, () => {})
  }
  setSnapshot({ status: 'signedOut', error: null })
}
