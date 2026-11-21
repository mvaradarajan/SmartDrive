import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  ensureRootFolder,
  getCachedRootId,
  listFiles,
  replaceContent,
  trashFile,
  updateMetadata,
  uploadFile,
} from '../lib/drive.js'
import { readSnapshot, writeSnapshot } from '../lib/snapshot.js'
import { pruneThumbs, seedThumb } from '../lib/thumbs.js'

/** @typedef {import('../lib/drive.js').VaultFile} VaultFile */

const initialState = {
  /** @type {VaultFile[]} */
  files: [],
  loading: true,
  /** true once files came from the network (not just the cached snapshot) */
  fresh: false,
  /** @type {Error | null} */
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: null }
    case 'snapshot':
      // Never let a (slow) snapshot read overwrite data that already came from Drive.
      return state.fresh ? state : { ...state, files: action.files }
    case 'page':
      return action.first
        ? { ...state, fresh: true, error: null, files: action.files }
        : { ...state, files: [...state.files, ...action.files] }
    case 'done':
      return { ...state, loading: false, error: null }
    case 'error':
      return { ...state, loading: false, error: action.error }
    case 'add':
      return { ...state, files: [action.file, ...state.files.filter((f) => f.id !== action.file.id)] }
    case 'replace':
      return { ...state, files: state.files.map((f) => (f.id === action.file.id ? action.file : f)) }
    case 'remove':
      return { ...state, files: state.files.filter((f) => f.id !== action.id) }
    default:
      return state
  }
}

export function useVaultFiles() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const generation = useRef(0)

  const fetchAll = useCallback(async () => {
    const gen = ++generation.current
    const live = () => gen === generation.current
    const onPage = (files, first) => {
      if (live()) dispatch({ type: 'page', files, first })
    }
    try {
      const cached = getCachedRootId()
      let files
      if (cached) {
        // List with the cached id while the folder is validated in parallel (saves a round trip).
        const [listed, rootId] = await Promise.all([
          listFiles(cached, onPage).catch((err) => err),
          ensureRootFolder(),
        ])
        if (rootId === cached) {
          if (listed instanceof Error) throw listed
          files = listed
        } else {
          files = await listFiles(rootId, onPage)
        }
      } else {
        files = await listFiles(await ensureRootFolder(), onPage)
      }
      if (!live()) return
      dispatch({ type: 'done' })
      pruneThumbs(files)
    } catch (error) {
      if (live()) dispatch({ type: 'error', error })
    }
  }, [])

  useEffect(() => {
    const cached = getCachedRootId()
    if (cached) {
      readSnapshot(cached).then((files) => {
        if (files) dispatch({ type: 'snapshot', files })
      })
    }
    fetchAll()
  }, [fetchAll])

  // Persist the list (debounced) whenever it settles, so the next visit paints instantly.
  useEffect(() => {
    if (state.loading || !state.fresh) return
    const rootId = getCachedRootId()
    if (!rootId) return
    const t = setTimeout(() => writeSnapshot(rootId, state.files), 1000)
    return () => clearTimeout(t)
  }, [state.files, state.loading, state.fresh])

  const refresh = useCallback(() => {
    dispatch({ type: 'loading' })
    return fetchAll()
  }, [fetchAll])

  /** @param {Blob} blob @param {Parameters<typeof uploadFile>[2]} meta */
  const upload = useCallback(async (blob, meta) => {
    const rootId = await ensureRootFolder()
    const file = await uploadFile(rootId, blob, meta)
    await seedThumb(file, blob)
    dispatch({ type: 'add', file })
    return file
  }, [])

  const update = useCallback(async (id, patch) => {
    const file = await updateMetadata(id, patch)
    dispatch({ type: 'replace', file })
    return file
  }, [])

  const replace = useCallback(async (id, blob) => {
    const file = await replaceContent(id, blob)
    await seedThumb(file, blob)
    dispatch({ type: 'replace', file })
    return file
  }, [])

  const trash = useCallback(async (id) => {
    await trashFile(id)
    dispatch({ type: 'remove', id })
  }, [])

  return { ...state, refresh, upload, update, replace, trash }
}
