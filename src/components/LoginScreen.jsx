import { useState } from 'react'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

// What a first-time visitor needs to know before handing Google permission to a stranger's app.
const FACTS = [
  {
    icon: FolderOutlinedIcon,
    title: 'Saved in your own Google Drive',
    body: 'Everything goes into a SmartDrive folder in your Drive. No new account to create, and your files aren’t stored anywhere else.',
  },
  {
    icon: LockOutlinedIcon,
    title: 'Only sees what it saves',
    body: 'SmartDrive can’t open, list or change any of your other Drive files.',
  },
  {
    icon: InboxOutlinedIcon,
    title: 'Save now, tag later',
    body: 'Files you save without tags wait in an Untagged inbox until you sort them.',
  },
]

function Facts() {
  return (
    <Stack component="ul" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0, textAlign: 'left' }}>
      {FACTS.map(({ icon: Icon, title, body }) => (
        <Stack component="li" key={title} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Icon color="primary" sx={{ mt: '2px', flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" component="p">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {body}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}

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
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Stack spacing={4} sx={{ width: '100%', textAlign: 'center' }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Box component="img" src="/icon.svg" alt="" sx={{ width: 72, height: 72, borderRadius: 4, boxShadow: 3 }} />
          <Stack spacing={1}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              SmartDrive
            </Typography>
            <Typography color="text.secondary" sx={{ textWrap: 'balance' }}>
              Keep receipts, documents and screenshots tagged, searchable and easy to find again.
            </Typography>
          </Stack>
        </Stack>

        {configured && <Facts />}

        {configured ? (
          <Stack spacing={1.5}>
            <Button variant="contained" size="large" fullWidth onClick={signIn} disabled={busy} sx={{ py: 1.5 }}>
              {busy ? 'Waiting for Google…' : 'Sign in with Google'}
            </Button>
            {(localError || error) && <Alert severity="error" sx={{ textAlign: 'left' }}>{localError || error}</Alert>}
            <Typography variant="caption" color="text.secondary" sx={{ textWrap: 'pretty' }}>
              Google will ask you to let SmartDrive manage only the files it creates. You can remove access at any time in
              your Google Account settings.
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
