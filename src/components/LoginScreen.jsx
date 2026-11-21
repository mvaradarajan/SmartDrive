import { useState } from 'react'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function LoginScreen({ configured, onSignIn, error }) {
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState(null)

  const signIn = async () => {
    setBusy(true)
    setLocalError(null)
    try {
      await onSignIn()
    } catch (err) {
      setLocalError(err.message)
      setBusy(false)
    }
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', py: 3 }}>
      <Stack spacing={3} sx={{ width: '100%', textAlign: 'center' }}>
        <Box component="img" src="/icon.svg" alt="" sx={{ width: 80, height: 80, mx: 'auto', borderRadius: 4, boxShadow: 3 }} />
        <Stack spacing={1}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            SmartDrive
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Capture, tag and organize screenshots and files. Everything is stored in a <strong>SmartDrive</strong> folder in your
            Google Drive.
          </Typography>
        </Stack>

        {configured ? (
          <Stack spacing={2}>
            <Button variant="contained" size="large" fullWidth onClick={signIn} disabled={busy} sx={{ py: 1.5 }}>
              {busy ? 'Connecting…' : 'Sign in with Google'}
            </Button>
            {(localError || error) && <Alert severity="error">{localError || error}</Alert>}
            <Typography variant="caption" color="text.secondary">
              SmartDrive only gets access to files it creates (<code>drive.file</code> scope).
            </Typography>
          </Stack>
        ) : (
          <Alert severity="warning" sx={{ textAlign: 'left' }}>
            <AlertTitle>Google Client ID missing</AlertTitle>
            Create <code>.env.local</code> with <code>VITE_GOOGLE_CLIENT_ID=…</code> and restart the dev server. See README for
            setup steps.
          </Alert>
        )}
      </Stack>
    </Container>
  )
}
