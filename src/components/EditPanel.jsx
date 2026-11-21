import { useRef, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { loadFileBlob, useAuthedImage } from '../hooks/useAuthedImage.js'
import { parseTags } from '../lib/tags.js'
import TagInput from './TagInput.jsx'

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Section({ title, children }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  )
}

/**
 * Right-side drawer (full width on phones) for inline editing.
 * Render with `key={file.id}` so the form resets when switching files.
 */
export default function EditPanel({ file, suggestions, onSave, onReplace, onTrash, onClose, notify }) {
  const props = file.appProperties || {}
  const initialTags = parseTags(props.tags)
  const [tags, setTags] = useState(initialTags)
  const [comment, setComment] = useState(file.description || '')
  const [busy, setBusy] = useState(null) // 'save' | 'replace' | 'trash' | 'download' | null
  const replaceInput = useRef(null)
  const { src, error, isImage } = useAuthedImage(file, { lazy: false })

  const dirty = tags.join(',') !== initialTags.join(',') || comment !== (file.description || '')

  const run = async (kind, fn) => {
    setBusy(kind)
    try {
      await fn()
    } catch (err) {
      notify(err.message || 'Something went wrong', 'error')
    } finally {
      setBusy(null)
    }
  }

  const save = (e) => {
    e.preventDefault()
    if (!dirty) return
    run('save', async () => {
      await onSave({ tags, comment })
      notify('Changes saved', 'success')
    })
  }

  const onReplacePicked = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (!window.confirm(`Replace "${file.name}" with "${picked.name}"? Tags and comments are kept.`)) return
    run('replace', async () => {
      await onReplace(picked)
      notify('File replaced', 'success')
    })
  }

  const download = () =>
    run('download', async () => {
      const blob = await loadFileBlob(file.id, file.modifiedTime)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })

  const trash = () => {
    if (!window.confirm(`Move "${file.name}" to Drive trash?`)) return
    run('trash', async () => {
      await onTrash()
      notify('Moved to trash', 'info')
    })
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={() => !busy && onClose()}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 448 } }, 'aria-label': `Edit ${file.name}` } }}
    >
      <Box component="form" onSubmit={save} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            px: 2,
            py: 1.5,
            pt: 'max(12px, env(safe-area-inset-top))',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle1" component="h2" noWrap title={file.name} sx={{ fontWeight: 600 }}>
              {file.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Added {dateFmt.format(new Date(file.createdTime))}
              {props.deviceLabel && ` · ${props.deviceLabel}`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} disabled={!!busy} aria-label="Close" edge="end">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={2.5} sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <Box
            sx={{
              minHeight: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          >
            {isImage && src && !error ? (
              <a href={src} target="_blank" rel="noreferrer">
                <Box component="img" src={src} alt={file.name} sx={{ display: 'block', maxHeight: '45svh', maxWidth: '100%', objectFit: 'contain' }} />
              </a>
            ) : isImage && !error ? (
              <Skeleton variant="rectangular" width="100%" height={192} />
            ) : (
              <InsertDriveFileIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
            )}
          </Box>

          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="outlined" color="inherit" startIcon={<SwapHorizIcon />} disabled={!!busy} onClick={() => replaceInput.current?.click()}>
              {busy === 'replace' ? 'Replacing…' : 'Replace file'}
            </Button>
            <Button variant="outlined" color="inherit" startIcon={<DownloadIcon />} disabled={!!busy} onClick={download}>
              Download
            </Button>
            {file.webViewLink && (
              <Button variant="outlined" color="inherit" startIcon={<OpenInNewIcon />} href={file.webViewLink} target="_blank" rel="noreferrer">
                Open in Drive
              </Button>
            )}
            <input ref={replaceInput} type="file" style={{ display: 'none' }} onChange={onReplacePicked} />
          </Stack>

          <Section title="Tags">
            <TagInput tags={tags} onChange={setTags} suggestions={suggestions} />
          </Section>

          <Section title="Comment">
            <TextField
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              minRows={5}
              placeholder="Add notes…"
              slotProps={{ htmlInput: { maxLength: 4000 } }}
            />
          </Section>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            p: 2,
            pb: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={trash} disabled={!!busy}>
            Trash
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button type="submit" variant="contained" size="large" disabled={!dirty || !!busy}>
            {busy === 'save' ? 'Saving…' : 'Save changes'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
