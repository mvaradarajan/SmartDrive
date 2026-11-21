import { useSyncExternalStore } from 'react'
import { getAuthSnapshot, isConfigured, signIn, signOut, subscribe } from '../lib/auth.js'
import { resetDriveCache } from '../lib/drive.js'

function signOutAndReset() {
  resetDriveCache()
  signOut()
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getAuthSnapshot)
  return { ...snapshot, isConfigured, signIn, signOut: signOutAndReset }
}
