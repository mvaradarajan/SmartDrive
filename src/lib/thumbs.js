// Image caching for the grid and the editor.
// - Thumbnails: originals are downscaled once on-device and persisted in IndexedDB,
//   so grid cards cost tens of KB and survive reloads.
// - Originals: small in-memory LRU only (editor preview + download).
import { clear, createStore, delMany, get, keys, set } from 'idb-keyval'
import { queueDownload } from './downloadQueue.js'

const THUMB_MAX_EDGE = 512 // ~2x a grid card's CSS width
const PASSTHROUGH_BYTES = 150 * 1024 // small files are already cheap; keep them as-is

/** @typedef {import('./drive.js').VaultFile} VaultFile */

/** Cache key that only changes when the file's *content* changes (not on tag/comment edits). */
export function revKey(file) {
  return `${file.id}:${file.headRevisionId || file.md5Checksum || file.modifiedTime || ''}`
}

// --- byte-bounded in-memory LRU -------------------------------------------------

function createBlobLru(maxBytes, maxEntries) {
  /** @type {Map<string, Blob>} */
  const map = new Map()
  let bytes = 0
  const remove = (key) => {
    const blob = map.get(key)
    if (!blob) return
    bytes -= blob.size
    map.delete(key)
  }
  return {
    get(key) {
      const blob = map.get(key)
      if (!blob) return null
      map.delete(key)
      map.set(key, blob) // refresh LRU position
      return blob
    },
    set(key, blob) {
      remove(key)
      map.set(key, blob)
      bytes += blob.size
      while (map.size > 1 && (bytes > maxBytes || map.size > maxEntries)) remove(map.keys().next().value)
    },
    clear() {
      map.clear()
      bytes = 0
    },
  }
}

const thumbMem = createBlobLru(20 * 1024 * 1024, 2000)
const originalMem = createBlobLru(60 * 1024 * 1024, 6)

// --- IndexedDB (lazy so a blocked/private IDB never breaks module load) -------------

let store = null
function thumbStore() {
  if (!store) store = createStore('smartdrive-thumbs', 'thumbs')
  return store
}

async function idbGet(key) {
  try {
    return (await get(key, thumbStore())) || null
  } catch {
    return null
  }
}

function idbSet(key, blob) {
  try {
    set(key, blob, thumbStore()).catch(() => {})
  } catch {
    /* ignore */
  }
}

// --- thumbnail generation -------------------------------------------------------

function encode(canvas, type, quality) {
  if (typeof canvas.convertToBlob === 'function') return canvas.convertToBlob({ type, quality })
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Downscales an image blob to a small WebP (JPEG where WebP encoding is unsupported, e.g. Safari).
 * Falls back to the original blob when it can't be decoded or wouldn't get smaller.
 * @param {Blob} blob
 * @returns {Promise<Blob>}
 */
export async function makeThumb(blob) {
  if (blob.size <= PASSTHROUGH_BYTES || /^image\/(svg|gif)/.test(blob.type)) return blob
  let bitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    return blob // e.g. HEIC on Chrome — let the <img> try the original
  }
  try {
    const scale = Math.min(1, THUMB_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement('canvas'), { width: w, height: h })
    const ctx = canvas.getContext('2d')
    if (!ctx) return blob
    ctx.drawImage(bitmap, 0, 0, w, h)

    let out = await encode(canvas, 'image/webp', 0.8)
    if (!out || out.type !== 'image/webp') {
      // JPEG has no alpha: paint white behind transparent pixels.
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      out = await encode(canvas, 'image/jpeg', 0.85)
    }
    return out && out.size < blob.size ? out : blob
  } catch {
    return blob
  } finally {
    bitmap.close?.()
  }
}

// --- public API -----------------------------------------------------------------

/**
 * Small preview for grid cards: memory → IndexedDB → download + downscale.
 * @param {VaultFile} file
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>}
 */
export async function getThumb(file, signal) {
  const key = revKey(file)
  const hit = thumbMem.get(key)
  if (hit) return hit
  const stored = await idbGet(key)
  if (stored) {
    thumbMem.set(key, stored)
    return stored
  }
  const original = await queueDownload(`orig:${key}`, file.id, signal)
  const thumb = await makeThumb(original)
  thumbMem.set(key, thumb)
  idbSet(key, thumb)
  return thumb
}

/**
 * Full-resolution content (editor preview, download). Memory-cached only.
 * @param {VaultFile} file
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>}
 */
export async function loadOriginal(file, signal) {
  const key = revKey(file)
  const hit = originalMem.get(key)
  if (hit) return hit
  const blob = await queueDownload(`orig:${key}`, file.id, signal)
  originalMem.set(key, blob)
  return blob
}

/**
 * Primes caches from a blob we already have locally (after upload/replace), so the new
 * file renders without downloading it back.
 * @param {VaultFile} file
 * @param {Blob} blob
 */
export async function seedThumb(file, blob) {
  if (!file?.mimeType?.startsWith('image/')) return
  const key = revKey(file)
  try {
    originalMem.set(key, blob)
    const thumb = await makeThumb(blob)
    thumbMem.set(key, thumb)
    idbSet(key, thumb)
  } catch {
    /* best effort */
  }
}

/** Removes persisted thumbnails for files that no longer exist (or whose content changed). */
export async function pruneThumbs(files) {
  try {
    const valid = new Set(files.map(revKey))
    const stale = (await keys(thumbStore())).filter((k) => !valid.has(String(k)))
    if (stale.length) await delMany(stale, thumbStore())
  } catch {
    /* ignore */
  }
}

/** Drops every cached image (sign-out: another account may sign in next). */
export async function clearThumbs() {
  thumbMem.clear()
  originalMem.clear()
  try {
    await clear(thumbStore())
  } catch {
    /* ignore */
  }
}
