import { useCallback, useEffect, useReducer } from 'react'
import {
  ensureRootFolder,
  listFiles,
  replaceContent,
  trashFile,
  updateMetadata,
  uploadFile,
} from '../lib/drive.js'

/** @typedef {import('../lib/drive.js').VaultFile} VaultFile */

const initialState = {
  /** @type {VaultFile[]} */
  files: [],
  loading: true,
  /** @type {Error | null} */
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: null }
    case 'loaded':
      return { ...state, loading: false, error: null, files: action.files }
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

  const fetchAll = useCallback(async () => {
    try {
      const rootId = await ensureRootFolder()
      const files = await listFiles(rootId)
      dispatch({ type: 'loaded', files })
    } catch (error) {
      dispatch({ type: 'error', error })
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const refresh = useCallback(() => {
    dispatch({ type: 'loading' })
    return fetchAll()
  }, [fetchAll])

  /** @param {Blob} blob @param {Parameters<typeof uploadFile>[2]} meta */
  const upload = useCallback(async (blob, meta) => {
    const rootId = await ensureRootFolder()
    const file = await uploadFile(rootId, blob, meta)
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
    dispatch({ type: 'replace', file })
    return file
  }, [])

  const trash = useCallback(async (id) => {
    await trashFile(id)
    dispatch({ type: 'remove', id })
  }, [])

  return { ...state, refresh, upload, update, replace, trash }
}
