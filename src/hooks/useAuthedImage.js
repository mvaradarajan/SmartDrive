import { useEffect, useRef, useState } from 'react'
import { downloadBlob } from '../lib/drive.js'

// Images are fetched via `alt=media` with the bearer token (thumbnailLink needs auth / is CORS-limited).
// Blobs are cached (small LRU) and downloads are throttled; each consumer owns its own object URL.

const MAX_CACHE = 60
const MAX_CONCURRENT = 4
const blobCache = new Map()
const inflight = new Map()
const queue = []
let active = 0

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const { task, resolve, reject } = queue.shift()
    active += 1
    task()
      .then(resolve, reject)
      .finally(() => {
        active -= 1
        pump()
      })
  }
}

function schedule(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject })
    pump()
  })
}

/** Loads (and caches) a Drive file's content. */
export function loadFileBlob(id, version = '') {
  const key = `${id}:${version}`
  if (blobCache.has(key)) {
    const blob = blobCache.get(key)
    blobCache.delete(key)
    blobCache.set(key, blob) // refresh LRU position
    return Promise.resolve(blob)
  }
  if (inflight.has(key)) return inflight.get(key)
  const promise = schedule(() => downloadBlob(id))
    .then((blob) => {
      blobCache.set(key, blob)
      if (blobCache.size > MAX_CACHE) blobCache.delete(blobCache.keys().next().value)
      return blob
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

/**
 * @param {import('../lib/drive.js').VaultFile} file
 * @param {{ lazy?: boolean }} [options]
 * @returns {{ ref: import('react').RefObject<HTMLElement>, src: string | null, error: Error | null, isImage: boolean }}
 */
export function useAuthedImage(file, { lazy = true } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(!lazy)
  const [result, setResult] = useState({ key: '', src: null, error: null })
  const isImage = Boolean(file?.mimeType?.startsWith('image/'))
  const key = file ? `${file.id}:${file.modifiedTime || ''}` : ''

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible || !isImage || !file) return
    let cancelled = false
    let objectUrl = null
    loadFileBlob(file.id, file.modifiedTime)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setResult({ key, src: objectUrl, error: null })
      })
      .catch((error) => {
        if (!cancelled) setResult({ key, src: null, error })
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [visible, isImage, file, key])

  const current = result.key === key ? result : { src: null, error: null }
  return { ref, src: current.src, error: current.error, isImage }
}
