import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

export default function Header({ count, loading, uploading = 0, onRefresh, onSignOut, expired, onReconnect }) {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', pt: 'env(safe-area-inset-top)' }}
    >
      <Container maxWidth="xl" disableGutters>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          <Box component="img" src="/icon.svg" alt="" sx={{ width: 32, height: 32, borderRadius: 2 }} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              SmartDrive
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {uploading > 0 ? (
                <>
                  <CircularProgress size={10} thickness={6} color="inherit" />
                  Uploading {uploading}…
                </>
              ) : loading ? (
                'Loading…'
              ) : (
                `${count} file${count === 1 ? '' : 's'}`
              )}
            </Typography>
          </Box>

          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={onRefresh} disabled={loading} aria-label="Refresh">
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton onClick={onSignOut} aria-label="Sign out" edge="end">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Container>

      {expired && (
        <Alert
          severity="warning"
          sx={{ borderRadius: 0, justifyContent: 'center', alignItems: 'center' }}
          action={
            <Button color="inherit" size="small" onClick={onReconnect}>
              Reconnect
            </Button>
          }
        >
          Your Google session expired.
        </Alert>
      )}
    </AppBar>
  )
}
