import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Backdrop from '@mui/material/Backdrop'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { applyFilters, collectTags, useFilters } from '../hooks/useFilters.js'
import { usePasteAndDrop } from '../hooks/usePasteAndDrop.js'
import { useVaultFiles } from '../hooks/useVaultFiles.js'
import { detectDeviceLabel } from '../lib/device.js'
import { chooseFileName } from '../lib/filename.js'
import { takeSharedPayload } from '../lib/shareInbox.js'
import { parseTags, serializeTags } from '../lib/tags.js'
import EditPanel from './EditPanel.jsx'
import { FirstRunState, NoMatchState } from './EmptyStates.jsx'
import FileCard from './FileCard.jsx'
import FilterBar from './FilterBar.jsx'
import Header from './Header.jsx'
import Toasts from './Toasts.jsx'
import UploadModal from './UploadModal.jsx'
import UploadSpeedDial from './UploadSpeedDial.jsx'

const gridSx = {
  display: 'grid',
  gap: { xs: 1.5, sm: 2 },
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))',
    lg: 'repeat(5, minmax(0, 1fr))',
  },
}

export default function Vault({ auth }) {
  const vault = useVaultFiles()
  const [filters, updateFilters, resetFilters] = useFilters()
  const [queue, setQueue] = useState([]) // { id, file, comment, name?, tags?, error? }[]
  const [uploading, setUploading] = useState(0) // background uploads in flight
  const [carry, setCarry] = useState(null) // { tags } carried to next queued file
  const [editingId, setEditingId] = useState(null)
  const [toasts, setToasts] = useState([])
  const captureRef = useRef(null)

  // --- toasts ---------------------------------------------------------------
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const notify = useCallback(
    (message, kind = 'info') => {
      const id = crypto.randomUUID()
      setToasts((t) => [...t, { id, message, kind }])
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3000)
    },
    [dismiss],
  )

  // --- capture --------------------------------------------------------------
  const enqueue = useCallback((files, comment = '') => {
    setQueue((q) => [...q, ...files.map((file) => ({ id: crypto.randomUUID(), file, comment }))])
  }, [])

  const dragging = usePasteAndDrop(enqueue)

  // Files handed over by the Share Target service worker.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('shared')) return
    params.delete('shared')
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    takeSharedPayload().then((payload) => {
      if (!payload) return
      if (payload.files?.length) {
        const comment = [payload.title, payload.text, payload.url].filter(Boolean).join('\n')
        enqueue(payload.files, comment)
      } else {
        notify('Nothing to save — share an image or file.', 'info')
      }
    })
  }, [enqueue, notify])

  const advanceQueue = (nextCarry) => {
    const remaining = queue.length - 1
    setQueue((q) => q.slice(1))
    setCarry(remaining > 0 ? nextCarry : null)
  }

  // Uploads run in the background so the capture modal closes instantly. A failed upload
  // goes back into the queue with its tags/comment so nothing is lost.
  const handleSave = ({ tags, comment, keepForNext }) => {
    const item = queue[0]
    const name = item.name || chooseFileName(item.file)
    const tagValue = serializeTags(tags)
    const appProperties = { deviceLabel: detectDeviceLabel() }
    if (tagValue) appProperties.tags = tagValue

    // On the very first save, point out where an untagged file ends up so the inbox isn't a mystery.
    const savedMessage =
      !tagValue && vault.files.length === 0 ? 'Saved. You’ll find it under Untagged until you add tags.' : 'Saved to SmartDrive'

    advanceQueue(keepForNext ? { tags } : null)
    setUploading((n) => n + 1)
    vault
      .upload(item.file, { name, description: comment.trim(), appProperties })
      .then(() => notify(savedMessage, 'success'))
      .catch((err) => {
        notify(`Upload failed: ${err.message}`, 'error')
        setQueue((q) => [...q, { ...item, id: crypto.randomUUID(), name, tags, comment, error: err.message }])
      })
      .finally(() => setUploading((n) => n - 1))
  }

  // Warn before closing the tab while uploads are still in flight.
  useEffect(() => {
    if (!uploading) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [uploading])

  const closeQueue = useCallback(() => {
    setQueue([])
    setCarry(null)
  }, [])

  // --- derived data ---------------------------------------------------------
  const tagCounts = useMemo(() => collectTags(vault.files), [vault.files])
  const suggestions = useMemo(() => tagCounts.map((t) => t.tag), [tagCounts])
  const untaggedCount = useMemo(
    () => vault.files.filter((f) => parseTags(f.appProperties?.tags).length === 0).length,
    [vault.files],
  )
  const visible = useMemo(() => applyFilters(vault.files, filters), [vault.files, filters])
  const editing = editingId ? vault.files.find((f) => f.id === editingId) : null

  const closeEditor = useCallback(() => setEditingId(null), [])

  const reconnect = () => auth.signIn().then(() => vault.error && vault.refresh()).catch(() => {})

  return (
    <Box sx={{ minHeight: '100svh' }}>
      <Header
        count={vault.files.length}
        loading={vault.loading}
        uploading={uploading}
        onRefresh={vault.refresh}
        onSignOut={auth.signOut}
        expired={auth.status === 'expired'}
        onReconnect={reconnect}
      />

      {/* Bottom padding keeps the last row clear of the upload button. */}
      <Container component="main" maxWidth="xl" sx={{ pt: { xs: 2, sm: 3 }, pb: 'calc(96px + env(safe-area-inset-bottom))' }}>
        <Stack spacing={2.5}>
          {/* Search and tags mean nothing until there is something to find. */}
          {vault.files.length > 0 && (
            <FilterBar
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              tagCounts={tagCounts}
              untaggedCount={untaggedCount}
            />
          )}

          {vault.error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={vault.refresh}>
                  Retry
                </Button>
              }
            >
              Couldn’t load your files: {vault.error.message}
            </Alert>
          )}

          {vault.loading && vault.files.length === 0 ? (
            <Box sx={gridSx}>
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} variant="rounded" sx={{ height: 'auto', aspectRatio: '3 / 4' }} />
              ))}
            </Box>
          ) : vault.files.length === 0 && !vault.error ? (
            <FirstRunState onAction={(key) => captureRef.current?.run(key)} />
          ) : visible.length === 0 ? (
            <NoMatchState filters={filters} onReset={resetFilters} />
          ) : (
            <Box sx={gridSx}>
              {visible.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onOpen={() => setEditingId(file.id)}
                  onTagClick={(tag) =>
                    !filters.tags.includes(tag) && updateFilters({ tags: [...filters.tags, tag], untagged: false })
                  }
                />
              ))}
            </Box>
          )}
        </Stack>
      </Container>

      <UploadSpeedDial ref={captureRef} onFiles={enqueue} onError={(message) => notify(message, 'error')} />

      {editing && (
        <EditPanel
          key={editing.id}
          file={editing}
          suggestions={suggestions}
          notify={notify}
          onClose={closeEditor}
          onSave={({ tags, comment }) =>
            vault.update(editing.id, {
              description: comment.trim(),
              // null removes the key in Drive's PATCH semantics
              appProperties: { tags: tags.length ? serializeTags(tags) : null },
            })
          }
          onReplace={(blob) => vault.replace(editing.id, blob)}
          onTrash={async () => {
            await vault.trash(editing.id)
            setEditingId(null)
          }}
        />
      )}

      {queue.length > 0 && (
        <UploadModal
          key={queue[0].id}
          item={queue[0]}
          remaining={queue.length - 1}
          suggestions={suggestions}
          carry={carry}
          onSave={handleSave}
          onSkip={() => advanceQueue(carry)}
          onClose={closeQueue}
        />
      )}

      <Backdrop open={dragging} sx={{ zIndex: (t) => t.zIndex.modal + 1, pointerEvents: 'none', p: 3 }}>
        <Paper
          elevation={0}
          sx={{
            px: 5,
            py: 6,
            border: 4,
            borderStyle: 'dashed',
            borderColor: 'primary.main',
            color: 'primary.main',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6">Drop files to upload</Typography>
        </Paper>
      </Backdrop>

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </Box>
  )
}
