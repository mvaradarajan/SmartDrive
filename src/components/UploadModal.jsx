import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { useObjectUrlRef } from '../hooks/useObjectUrlRef.js'
import TagInput from './TagInput.jsx'

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Minimal capture flow: preview → tags → comment → Save.
 * Full-screen on phones. Render with `key={item.id}` so state resets per queued file.
 */
export default function UploadModal({ item, remaining, suggestions, carry, onSave, onSkip, onClose }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const [tags, setTags] = useState(carry?.tags ?? [])
  const [comment, setComment] = useState(item.comment || '')
  const [keepForNext, setKeepForNext] = useState(Boolean(carry))
  const [saving, setSaving] = useState(false)
  const previewRef = useObjectUrlRef(item.file)
  const isImage = item.file.type?.startsWith('image/')

  const save = async (e) => {
    e?.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await onSave({ tags, comment, keepForNext })
    } catch {
      setSaving(false) // stay open so the user can retry
    }
  }

  const close = () => !saving && onClose()

  return (
    <Dialog
      open
      onClose={close}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-label="New upload"
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: save,
          onKeyDown: (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(e)
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1, pt: fullScreen ? 'max(16px, env(safe-area-inset-top))' : 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          New upload
          {remaining > 0 && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              +{remaining} more queued
            </Typography>
          )}
        </Box>
        <IconButton onClick={close} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', borderRadius: 1, bgcolor: 'action.hover' }}>
            {isImage ? (
              <Box
                component="img"
                ref={previewRef}
                alt="Preview"
                sx={{ maxHeight: fullScreen ? '42svh' : '38svh', maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Stack spacing={1} sx={{ alignItems: 'center', py: 4, px: 2, color: 'text.secondary', minWidth: 0 }}>
                <InsertDriveFileIcon sx={{ fontSize: 40 }} />
                <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
                  {item.file.name || 'Untitled file'}
                </Typography>
                <Typography variant="caption">{formatBytes(item.file.size)}</Typography>
              </Stack>
            )}
          </Box>

          <TagInput tags={tags} onChange={setTags} suggestions={suggestions} />

          <TextField
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment or notes (optional)"
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 4000 } }}
          />

          {remaining > 0 && (
            <FormControlLabel
              control={<Checkbox checked={keepForNext} onChange={(e) => setKeepForNext(e.target.checked)} />}
              label="Use same tags for the next file"
              slotProps={{ typography: { variant: 'body2', color: 'text.secondary' } }}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, pb: fullScreen ? 'max(12px, env(safe-area-inset-bottom))' : 1.5, gap: 1 }}>
        {remaining > 0 && (
          <Button onClick={onSkip} disabled={saving} color="inherit" size="large">
            Skip
          </Button>
        )}
        <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ flexGrow: 1, py: 1.25 }}>
          {saving ? 'Saving…' : 'Save to Drive'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
