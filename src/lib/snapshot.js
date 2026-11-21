// Last known file list, persisted so the grid can paint instantly on the next visit
// while a fresh list loads in the background.
import { del, get, set } from 'idb-keyval'

const KEY = 'smartdrive.files'

/** @returns {Promise<import('./drive.js').VaultFile[] | null>} */
export async function readSnapshot(rootId) {
  try {
    const snap = await get(KEY)
    return snap && snap.rootId === rootId && Array.isArray(snap.files) ? snap.files : null
  } catch {
    return null
  }
}

export function writeSnapshot(rootId, files) {
  try {
    set(KEY, { rootId, files, savedAt: Date.now() }).catch(() => {})
  } catch {
    /* ignore */
  }
}

export async function clearSnapshot() {
  try {
    await del(KEY)
  } catch {
    /* ignore */
  }
}
