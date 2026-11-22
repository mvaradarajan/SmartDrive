import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { isScreenCaptureSupported } from '../lib/capture.js'
import { detectDeviceLabel } from '../lib/device.js'

const kbdSx = { border: 1, borderColor: 'divider', borderRadius: 0.5, px: 0.5, fontFamily: 'inherit', fontSize: '0.85em' }

function Kbd({ children }) {
  return (
    <Box component="kbd" sx={kbdSx}>
      {children}
    </Box>
  )
}

function Shell({ icon, tone = 'primary', title, children }) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 6, sm: 8 }, mx: 'auto', maxWidth: 440 }}>
      <Avatar
        variant="rounded"
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          bgcolor: tone === 'primary' ? 'primary.main' : 'action.selected',
          color: tone === 'primary' ? 'primary.contrastText' : 'text.secondary',
        }}
      >
        {icon}
      </Avatar>
      <Typography variant="h6" component="h2" sx={{ textWrap: 'balance' }}>
        {title}
      </Typography>
      {children}
    </Stack>
  )
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

/**
 * First use: nothing saved yet. Puts the real capture actions in the middle of the page instead of
 * pointing at the corner button, and tailors the hints to the device.
 * @param {{ onAction: (key: 'screenshot' | 'camera' | 'document') => void }} props
 */
export function FirstRunState({ onAction }) {
  const device = detectDeviceLabel()
  const touch = device === 'iOS' || device === 'Android'
  const modifier = device === 'macOS' || device === 'iOS' ? '⌘' : 'Ctrl'
  const showShareTip = device === 'Android' && !isStandalone()

  const camera = (
    <Button key="camera" variant={touch ? 'contained' : 'outlined'} startIcon={<PhotoCameraIcon />} onClick={() => onAction('camera')}>
      Take a photo
    </Button>
  )
  const chooseFiles = (
    <Button key="document" variant={touch ? 'outlined' : 'contained'} startIcon={<UploadFileIcon />} onClick={() => onAction('document')}>
      Choose files
    </Button>
  )
  const screenshot = !touch && isScreenCaptureSupported() && (
    <Button key="screenshot" variant="outlined" startIcon={<ScreenshotMonitorIcon />} onClick={() => onAction('screenshot')}>
      Screenshot
    </Button>
  )

  return (
    <Shell icon={<AddPhotoAlternateIcon fontSize="large" />} title="Save your first file">
      <Typography variant="body2" color="text.secondary" sx={{ textWrap: 'pretty' }}>
        Receipts, documents, screenshots: everything you save goes into the <strong>SmartDrive</strong> folder in your
        Google Drive. Add a tag or two, like <em>receipt</em> or <em>tax</em>, and you can find it again in seconds.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ pt: 1.5, width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}
      >
        {touch ? [camera, chooseFiles] : [chooseFiles, screenshot, camera].filter(Boolean)}
      </Stack>

      {!touch && (
        <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
          Or paste with <Kbd>{modifier}</Kbd>+<Kbd>V</Kbd>, or drop files anywhere on this page.
        </Typography>
      )}
      {showShareTip && (
        <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5, textWrap: 'pretty' }}>
          Install SmartDrive from Chrome’s menu to save straight from any app’s Share button.
        </Typography>
      )}
    </Shell>
  )
}

/**
 * Files exist but the current filters hide all of them. An empty Untagged inbox is a success,
 * not a dead end, so it gets its own wording.
 * @param {{
 *   filters: import('../hooks/useFilters.js').Filters,
 *   onReset: () => void,
 * }} props
 */
export function NoMatchState({ filters, onReset }) {
  const inboxOnly = filters.untagged && !filters.search.trim()

  if (inboxOnly) {
    return (
      <Shell icon={<DoneAllIcon fontSize="large" />} title="Everything is tagged">
        <Typography variant="body2" color="text.secondary" sx={{ textWrap: 'pretty' }}>
          Nothing left to sort. Files you save without tags will wait here until you tag them.
        </Typography>
        <Box sx={{ pt: 1 }}>
          <Button variant="outlined" onClick={onReset}>
            Show all files
          </Button>
        </Box>
      </Shell>
    )
  }

  const hint =
    filters.tags.length > 1
      ? 'Only files with all the selected tags are shown. Try removing a tag.'
      : filters.search.trim()
        ? 'Search looks at file names and comments. Try a shorter or different word.'
        : 'Try a different tag or search.'

  return (
    <Shell icon={<SearchOffIcon fontSize="large" />} tone="neutral" title="No files match">
      <Typography variant="body2" color="text.secondary" sx={{ textWrap: 'pretty' }}>
        {hint}
      </Typography>
      <Box sx={{ pt: 1 }}>
        <Button variant="outlined" onClick={onReset}>
          Clear filters
        </Button>
      </Box>
    </Shell>
  )
}
