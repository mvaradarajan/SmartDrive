import { useEffect, useRef, useState } from 'react'

const isEditable = (target) =>
  target instanceof HTMLElement && Boolean(target.closest('input, textarea, [contenteditable="true"]'))

const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')

/**
 * Global Ctrl/Cmd+V image paste and window-level drag & drop.
 * @param {(files: File[]) => void} onFiles
 * @returns {boolean} whether files are currently being dragged over the window
 */
export function usePasteAndDrop(onFiles) {
  const [dragging, setDragging] = useState(false)
  const onFilesRef = useRef(onFiles)

  useEffect(() => {
    onFilesRef.current = onFiles
  }, [onFiles])

  useEffect(() => {
    let depth = 0

    const onPaste = (e) => {
      if (isEditable(e.target)) return
      const files = Array.from(e.clipboardData?.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter(Boolean)
      if (files.length) {
        e.preventDefault()
        onFilesRef.current(files)
      }
    }
    const onDragEnter = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth += 1
      setDragging(true)
    }
    const onDragOver = (e) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const files = Array.from(e.dataTransfer.files || [])
      if (files.length) onFilesRef.current(files)
    }

    window.addEventListener('paste', onPaste)
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return dragging
}
