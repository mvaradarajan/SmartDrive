// Throttled, cancellable Drive downloads.
// - LIFO: the most recently requested file (usually what's on screen now) downloads first.
// - Requests for the same key share one download; it is aborted once every caller has aborted.
import { downloadBlob } from './drive.js'

const MAX_CONCURRENT = 6

/** @typedef {{ key: string, id: string, controller: AbortController, refs: number, started: boolean, promise: Promise<Blob>, resolve: (b: Blob) => void, reject: (e: unknown) => void }} Entry */

/** @type {Entry[]} pending (not yet started) entries; the end of the array is served first */
const stack = []
/** @type {Map<string, Entry>} */
const entries = new Map()
let active = 0

export const isAbortError = (err) => err?.name === 'AbortError'
const abortError = () => new DOMException('Download aborted', 'AbortError')

function pump() {
  while (active < MAX_CONCURRENT && stack.length) {
    const entry = stack.pop()
    entry.started = true
    active += 1
    downloadBlob(entry.id, { signal: entry.controller.signal })
      .then(entry.resolve, entry.reject)
      .finally(() => {
        active -= 1
        if (entries.get(entry.key) === entry) entries.delete(entry.key)
        pump()
      })
  }
}

/** @param {Entry} entry */
function release(entry) {
  entry.refs -= 1
  if (entry.refs > 0) return
  if (entries.get(entry.key) === entry) entries.delete(entry.key)
  const i = stack.indexOf(entry)
  if (i >= 0) stack.splice(i, 1)
  entry.controller.abort()
  entry.reject(abortError())
}

/**
 * Queues a download of Drive file `id`, deduplicated by `key`.
 * @param {string} key
 * @param {string} id
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>}
 */
export function queueDownload(key, id, signal) {
  if (signal?.aborted) return Promise.reject(abortError())

  let entry = entries.get(key)
  if (!entry) {
    /** @type {any} */
    const created = { key, id, controller: new AbortController(), refs: 0, started: false }
    created.promise = new Promise((resolve, reject) => {
      created.resolve = resolve
      created.reject = reject
    })
    entry = /** @type {Entry} */ (created)
    entries.set(key, entry)
    stack.push(entry)
  } else if (!entry.started) {
    // Requested again: move it to the front of the line.
    const i = stack.indexOf(entry)
    if (i >= 0) stack.splice(i, 1)
    stack.push(entry)
  }
  entry.refs += 1
  const shared = entry

  const result = new Promise((resolve, reject) => {
    let settled = false
    const onAbort = () => {
      if (settled) return
      settled = true
      reject(abortError())
      release(shared)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    shared.promise.then(
      (blob) => {
        settled = true
        signal?.removeEventListener('abort', onAbort)
        resolve(blob)
      },
      (err) => {
        settled = true
        signal?.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })

  pump()
  return result
}
