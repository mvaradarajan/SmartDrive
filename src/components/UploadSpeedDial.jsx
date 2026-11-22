import { useImperativeHandle, useRef, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import Backdrop from '@mui/material/Backdrop'
import SpeedDial from '@mui/material/SpeedDial'
import SpeedDialAction from '@mui/material/SpeedDialAction'
import SpeedDialIcon from '@mui/material/SpeedDialIcon'
import { captureScreenshot, isCameraSupported, isScreenCaptureSupported } from '../lib/capture.js'
import CameraDialog from './CameraDialog.jsx'

const hiddenInput = { display: 'none' }

/**
 * Bottom-right upload menu: Screenshot (desktop only), Camera, Upload document.
 * `ref.current.run(key)` triggers an action from elsewhere (e.g. the empty-state buttons).
 * @param {{
 *   onFiles: (files: File[]) => void,
 *   onError: (message: string) => void,
 *   ref?: import('react').Ref<{ run: (key: 'screenshot' | 'camera' | 'document') => void }>,
 * }} props
 */
export default function UploadSpeedDial({ onFiles, onError, ref }) {
  const [open, setOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInput = useRef(null)
  const cameraInput = useRef(null)

  const onPicked = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) onFiles(files)
  }

  const screenshot = async () => {
    setOpen(false)
    try {
      onFiles([await captureScreenshot()])
    } catch (err) {
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') onError(`Screenshot failed: ${err.message}`)
    }
  }

  // In-app camera everywhere it's supported: opening the native camera app sends this
  // tab to the background, and if the page reloads meanwhile (Vite dev reconnect,
  // Android discarding the tab) the photo is lost before it reaches the upload modal.
  const camera = () => {
    setOpen(false)
    if (isCameraSupported()) setCameraOpen(true)
    else cameraInput.current?.click()
  }

  const nativeCamera = () => {
    setCameraOpen(false)
    cameraInput.current?.click()
  }

  const pickDocument = () => {
    setOpen(false)
    fileInput.current?.click()
  }

  const actions = [
    isScreenCaptureSupported() && { key: 'screenshot', label: 'Screenshot', icon: <ScreenshotMonitorIcon />, onClick: screenshot },
    { key: 'camera', label: 'Camera', icon: <PhotoCameraIcon />, onClick: camera },
    { key: 'document', label: 'Upload document', icon: <UploadFileIcon />, onClick: pickDocument },
  ].filter(Boolean)

  useImperativeHandle(ref, () => ({ run: (key) => actions.find((a) => a.key === key)?.onClick() }))

  return (
    <>
      <Backdrop open={open} onClick={() => setOpen(false)} sx={{ zIndex: (t) => t.zIndex.speedDial - 1 }} />
      <SpeedDial
        ariaLabel="Upload"
        icon={<SpeedDialIcon icon={<CloudUploadIcon />} openIcon={<CloseIcon />} />}
        open={open}
        // Tap/click only — no hover/focus opening, which misbehaves on touch screens.
        onOpen={(_, reason) => reason === 'toggle' && setOpen(true)}
        onClose={(_, reason) => reason !== 'mouseLeave' && reason !== 'blur' && setOpen(false)}
        sx={{ position: 'fixed', right: 16, bottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {actions.map((a) => (
          <SpeedDialAction
            key={a.key}
            icon={a.icon}
            onClick={a.onClick}
            slotProps={{ tooltip: { open: true, title: a.label } }}
            sx={{ '& .MuiSpeedDialAction-staticTooltipLabel': { whiteSpace: 'nowrap' } }}
          />
        ))}
      </SpeedDial>

      <input ref={fileInput} type="file" multiple style={hiddenInput} onChange={onPicked} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" style={hiddenInput} onChange={onPicked} />

      {cameraOpen && (
        <CameraDialog
          onClose={() => setCameraOpen(false)}
          onFallback={nativeCamera}
          onCapture={(file) => {
            setCameraOpen(false)
            onFiles([file])
          }}
        />
      )}
    </>
  )
}
