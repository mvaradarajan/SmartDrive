import { del, get } from 'idb-keyval'
import { SHARE_KEY } from './shareKeys.js'

let taken = null

/**
 * Reads and clears the payload the service worker stored for a Share Target POST.
 * Only the first call per page load returns the payload (guards StrictMode double effects).
 * @returns {Promise<{files: File[], title: string, text: string, url: string} | null>}
 */
export function takeSharedPayload() {
  if (taken) return taken.then(() => null)
  taken = (async () => {
    try {
      const payload = await get(SHARE_KEY)
      if (payload) await del(SHARE_KEY)
      return payload ?? null
    } catch (err) {
      console.error('Failed to read shared files', err)
      return null
    }
  })()
  return taken
}
