import { useCallback, useEffect, useRef, useState } from 'react'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import CameraswitchIcon from '@mui/icons-material/Cameraswitch'
import CloseIcon from '@mui/icons-material/Close'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { grabFrame, isCameraSupported, stopStream } from '../lib/capture.js'

function describeError(err) {
  if (err?.name === 'NotAllowedError') return 'Camera access was denied. Allow it in your browser settings and try again.'
  if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') return 'No camera was found on this device.'
  return err?.message || 'Could not start the camera.'
}

/**
 * Live in-app camera preview + shutter (phones and desktop). Mount only while open so
 * the stream is started on mount and always stopped on unmount.
 * `onFallback` (optional) switches to the device's native camera app if this one fails.
 */
export default function CameraDialog({ onCapture, onClose, onFallback }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const supported = isCameraSupported()
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [facing, setFacing] = useState('environment') // rear camera first on phones
  const videoRef = useRef(null)

  useEffect(() => {
    if (!supported) return
    let active = true
    let current = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (!active) return stopStream(s)
        current = s
        setStream(s)
      })
      .catch((err) => active && setError(err))
    return () => {
      active = false
      stopStream(current)
    }
  }, [supported, facing])

  const flip = () => {
    setReady(false)
    setError(null)
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'))
  }

  const attachVideo = useCallback(
    (el) => {
      videoRef.current = el
      if (el && stream && el.srcObject !== stream) el.srcObject = stream
    },
    [stream],
  )

  const shoot = async () => {
    const video = videoRef.current
    if (!video || !ready || busy) return
    setBusy(true)
    try {
      onCapture(await grabFrame(video, 'camera.jpg', 'image/jpeg', 0.92))
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  const message = !supported ? 'This browser cannot access a camera.' : error ? describeError(error) : null

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
        <Box sx={{ flexGrow: 1 }}>Camera</Box>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          minHeight: 280,
          bgcolor: 'common.black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {message ? (
          <Alert
            severity="warning"
            sx={{ m: 2 }}
            action={
              onFallback && (
                <Button color="inherit" size="small" onClick={onFallback} sx={{ whiteSpace: 'nowrap' }}>
                  Use camera app
                </Button>
              )
            }
          >
            {message}
          </Alert>
        ) : (
          <>
            <Box
              component="video"
              ref={attachVideo}
              autoPlay
              muted
              playsInline
              onLoadedData={() => setReady(true)}
              sx={{ width: '100%', maxHeight: fullScreen ? 'calc(100svh - 160px)' : '70vh', objectFit: 'contain' }}
            />
            {!ready && <CircularProgress sx={{ position: 'absolute', color: 'common.white' }} />}
          </>
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          px: 2,
          py: 2,
          pb: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        <span />
        <Fab color="primary" size="large" onClick={shoot} disabled={!ready || busy || Boolean(message)} aria-label="Take photo">
          <CameraAltIcon />
        </Fab>
        <Box sx={{ justifySelf: 'end' }}>
          {supported && (
            <IconButton onClick={flip} disabled={busy} aria-label="Switch camera">
              <CameraswitchIcon />
            </IconButton>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
