import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'

/** @param {{ toasts: { id: string, message: string, kind: 'success' | 'error' | 'info' }[], onDismiss: (id: string) => void }} props */
export default function Toasts({ toasts, onDismiss }) {
  const current = toasts[toasts.length - 1] || null
  // Keep the last toast rendered while the Snackbar plays its exit transition.
  const [shown, setShown] = useState(current)
  if (current && current !== shown) setShown(current)
  if (!shown) return null

  return (
    <Snackbar
      key={shown.id}
      open={Boolean(current)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      // Sit above the bottom-right upload button on phones.
      sx={{ bottom: { xs: 'calc(88px + env(safe-area-inset-bottom))', sm: 24 } }}
    >
      <Alert
        variant="filled"
        severity={shown.kind || 'info'}
        onClick={() => onDismiss(shown.id)}
        onClose={() => onDismiss(shown.id)}
        sx={{ width: '100%', maxWidth: 480, cursor: 'pointer' }}
      >
        {shown.message}
      </Alert>
    </Snackbar>
  )
}
