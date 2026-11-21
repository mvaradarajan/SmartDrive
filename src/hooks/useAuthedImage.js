import { useEffect, useRef, useState } from 'react'
import { isAbortError } from '../lib/downloadQueue.js'
import { getThumb, loadOriginal, revKey } from '../lib/thumbs.js'

// Images are fetched via `alt=media` with the bearer token (thumbnailLink needs auth / is CORS-limited).
// Grid cards use small on-device thumbnails (persisted in IndexedDB); the editor uses the original.
// Each consumer owns its own object URL.

/**
 * @param {import('../lib/drive.js').VaultFile} file
 * @param {{ lazy?: boolean, variant?: 'thumb' | 'full' }} [options]
 * @returns {{ ref: import('react').RefObject<HTMLElement>, src: string | null, error: Error | null, isImage: boolean }}
 */
export function useAuthedImage(file, { lazy = true, variant = 'thumb' } = {}) {
  const ref = useRef(null)
  const fileRef = useRef(file)
  const [inView, setInView] = useState(!lazy)
  const [result, setResult] = useState({ key: '', src: null, error: null })
  const isImage = Boolean(file?.mimeType?.startsWith('image/'))
  const key = file ? `${variant}:${revKey(file)}` : ''

  useEffect(() => {
    fileRef.current = file
  })

  // Track visibility continuously so a card scrolled away before loading cancels its download.
  useEffect(() => {
    if (!lazy) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[entries.length - 1].isIntersecting),
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [lazy])

  const loaded = result.key === key
  const shouldLoad = Boolean(key) && isImage && (inView || !lazy) && !loaded

  useEffect(() => {
    if (!shouldLoad) return
    const controller = new AbortController()
    const load = variant === 'full' ? loadOriginal : getThumb
    load(fileRef.current, controller.signal).then(
      (blob) => {
        if (!controller.signal.aborted) setResult({ key, src: URL.createObjectURL(blob), error: null })
      },
      (error) => {
        if (!controller.signal.aborted && !isAbortError(error)) setResult({ key, src: null, error })
      },
    )
    return () => controller.abort()
  }, [shouldLoad, key, variant])

  // Revoke each object URL once it's replaced or the component unmounts.
  useEffect(() => {
    const src = result.src
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [result.src])

  const current = loaded ? result : { src: null, error: null }
  return { ref, src: current.src, error: current.error, isImage }
}
