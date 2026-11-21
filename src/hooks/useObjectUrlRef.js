import { useCallback } from 'react'

/**
 * Callback ref that previews a local Blob/File in an <img>, revoking the object URL on cleanup.
 * Uses React 19 ref-cleanup functions so no state/effect is needed.
 * @param {Blob | null | undefined} blob
 */
export function useObjectUrlRef(blob) {
  return useCallback(
    (el) => {
      if (!el || !blob) return
      const url = URL.createObjectURL(blob)
      el.src = url
      return () => URL.revokeObjectURL(url)
    },
    [blob],
  )
}
