import { useCallback, useEffect, useState } from 'react'
import { parseTags } from '../lib/tags.js'

/**
 * @typedef {{ tags: string[], untagged: boolean, search: string }} Filters
 */

/** @returns {Filters} */
function readFromUrl() {
  const p = new URLSearchParams(window.location.search)
  return {
    tags: parseTags(p.get('tags') || ''),
    untagged: p.get('untagged') === '1',
    search: p.get('q') || '',
  }
}

function writeToUrl(filters) {
  const p = new URLSearchParams(window.location.search)
  const setOrDelete = (k, v) => (v ? p.set(k, v) : p.delete(k))
  p.delete('ff') // legacy form-factor filter param
  setOrDelete('tags', filters.tags.join(','))
  setOrDelete('untagged', filters.untagged ? '1' : '')
  setOrDelete('q', filters.search)
  const qs = p.toString()
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState(window.history.state, '', url)
}

/** Filter state synced to the URL query string. */
export function useFilters() {
  const [filters, setFilters] = useState(readFromUrl)

  useEffect(() => {
    writeToUrl(filters)
  }, [filters])

  const update = useCallback((patch) => setFilters((f) => ({ ...f, ...patch })), [])
  const reset = useCallback(() => setFilters({ tags: [], untagged: false, search: '' }), [])

  return [filters, update, reset]
}

/**
 * @param {import('../lib/drive.js').VaultFile[]} files
 * @param {Filters} filters
 */
export function applyFilters(files, filters) {
  const needle = filters.search.trim().toLowerCase()
  return files.filter((file) => {
    const props = file.appProperties || {}
    const tags = parseTags(props.tags)
    if (filters.untagged && tags.length) return false
    if (filters.tags.length && !filters.tags.every((t) => tags.includes(t))) return false
    if (needle) {
      const haystack = `${file.name}\n${file.description || ''}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

/** @returns {{ tag: string, count: number }[]} sorted by count desc, then name */
export function collectTags(files) {
  const counts = new Map()
  for (const file of files) {
    for (const tag of parseTags(file.appProperties?.tags)) counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
