// Google Drive REST v3 client. All app state (files + metadata) lives here.
import { getToken, invalidateToken } from './auth.js'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const ROOT_KEY = 'smartdrive.rootFolderId'

export const ROOT_FOLDER_NAME = 'SmartDrive'
export const FILE_FIELDS =
  'id,name,mimeType,thumbnailLink,webViewLink,createdTime,modifiedTime,headRevisionId,md5Checksum,description,appProperties'

/**
 * @typedef {{ tags?: string, deviceLabel?: string }} AppProps
 * @typedef {{
 *   id: string, name: string, mimeType: string, thumbnailLink?: string, webViewLink?: string,
 *   createdTime: string, modifiedTime?: string, headRevisionId?: string, md5Checksum?: string,
 *   description?: string, appProperties?: AppProps
 * }} VaultFile
 */

export class DriveError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'DriveError'
    this.status = status
  }
}

async function driveFetch(url, init = {}, retried = false) {
  const accessToken = await getToken({ forceRefresh: retried })
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  const res = await fetch(url, { ...init, headers })

  if (res.status === 401 && !retried) {
    invalidateToken()
    return driveFetch(url, init, true)
  }
  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = body?.error?.message || message
    } catch {
      /* non-JSON error body */
    }
    throw new DriveError(res.status, message)
  }
  return res
}

const json = (res) => res.json()
const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

function readCachedRootId() {
  try {
    return localStorage.getItem(ROOT_KEY)
  } catch {
    return null
  }
}

function cacheRootId(id) {
  try {
    if (id) localStorage.setItem(ROOT_KEY, id)
    else localStorage.removeItem(ROOT_KEY)
  } catch {
    /* ignore */
  }
}

/** The last known root folder id (unvalidated), or null. Lets listing start before validation finishes. */
export function getCachedRootId() {
  return readCachedRootId()
}

let rootPromise = null

/**
 * Finds or creates the `SmartDrive` root folder and caches its id.
 * Concurrent callers share one lookup so the folder is never created twice.
 * @returns {Promise<string>}
 */
export function ensureRootFolder() {
  if (!rootPromise) {
    rootPromise = resolveRootFolder().catch((err) => {
      rootPromise = null
      throw err
    })
  }
  return rootPromise
}

/** Forget the cached root folder (call on sign-out; another account may sign in next). */
export function resetDriveCache() {
  rootPromise = null
  cacheRootId(null)
}

async function resolveRootFolder() {
  const cached = readCachedRootId()
  if (cached) {
    try {
      const folder = await driveFetch(`${API}/files/${cached}?fields=id,trashed`).then(json)
      if (!folder.trashed) return folder.id
    } catch (err) {
      if (!(err instanceof DriveError) || err.status !== 404) throw err
    }
    cacheRootId(null)
  }

  const params = new URLSearchParams({
    q: `name='${q(ROOT_FOLDER_NAME)}' and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: 'files(id,name)',
    spaces: 'drive',
    pageSize: '1',
  })
  const found = await driveFetch(`${API}/files?${params}`).then(json)
  if (found.files?.length) {
    cacheRootId(found.files[0].id)
    return found.files[0].id
  }

  const created = await driveFetch(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ROOT_FOLDER_NAME, mimeType: FOLDER_MIME }),
  }).then(json)
  cacheRootId(created.id)
  return created.id
}

/**
 * Lists every non-trashed file in the root folder (follows pagination).
 * @param {string} rootId
 * @param {(files: VaultFile[], first: boolean) => void} [onPage] called as each page arrives (progressive rendering)
 */
export async function listFiles(rootId, onPage) {
  /** @type {VaultFile[]} */
  const all = []
  let pageToken = ''
  let first = true
  do {
    const params = new URLSearchParams({
      q: `'${q(rootId)}' in parents and trashed = false and mimeType != '${FOLDER_MIME}'`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      orderBy: 'createdTime desc',
      pageSize: '1000',
      spaces: 'drive',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const page = await driveFetch(`${API}/files?${params}`).then(json)
    const files = page.files || []
    all.push(...files)
    onPage?.(files, first)
    first = false
    pageToken = page.nextPageToken || ''
  } while (pageToken)
  return all
}

/**
 * Uploads binary + metadata in a single multipart request.
 * @param {string} rootId
 * @param {Blob} blob
 * @param {{ name: string, description?: string, appProperties: AppProps }} meta
 * @returns {Promise<VaultFile>}
 */
export async function uploadFile(rootId, blob, meta) {
  const boundary = `smartdrive-${crypto.randomUUID()}`
  const metadata = {
    name: meta.name,
    parents: [rootId],
    description: meta.description || '',
    appProperties: meta.appProperties,
    mimeType: blob.type || 'application/octet-stream',
  }
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ])
  return driveFetch(`${UPLOAD_API}/files?uploadType=multipart&fields=${FILE_FIELDS}`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  }).then(json)
}

/**
 * Patches description / appProperties / name.
 * @param {string} id
 * @param {{ name?: string, description?: string, appProperties?: AppProps }} patch
 * @returns {Promise<VaultFile>}
 */
export async function updateMetadata(id, patch) {
  return driveFetch(`${API}/files/${id}?fields=${FILE_FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then(json)
}

/** Replaces the file's content, keeping name/description/appProperties. */
export async function replaceContent(id, blob) {
  return driveFetch(`${UPLOAD_API}/files/${id}?uploadType=media&fields=${FILE_FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  }).then(json)
}

/**
 * Downloads the file content as a Blob (authenticated).
 * @param {string} id
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function downloadBlob(id, { signal } = {}) {
  const res = await driveFetch(`${API}/files/${id}?alt=media`, { signal })
  return res.blob()
}

/** Moves a file to Drive trash (recoverable). */
export async function trashFile(id) {
  await driveFetch(`${API}/files/${id}?fields=id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
}
