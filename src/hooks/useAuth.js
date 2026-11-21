import { useSyncExternalStore } from 'react'
import { getAuthSnapshot, isConfigured, signIn, signOut, subscribe } from '../lib/auth.js'
import { resetDriveCache } from '../lib/drive.js'
import { clearSnapshot } from '../lib/snapshot.js'
import { clearThumbs } from '../lib/thumbs.js'

function signOutAndReset() {
  resetDriveCache()
  // Another account may sign in next: drop the cached file list and images.
  clearSnapshot()
  clearThumbs()
  signOut()
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getAuthSnapshot)
  return { ...snapshot, isConfigured, signIn, signOut: signOutAndReset }
}
