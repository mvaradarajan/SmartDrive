import Chip from '@mui/material/Chip'

/** Small read-only OS badge overlaid on card media. */
export function DeviceBadge({ deviceLabel }) {
  if (!deviceLabel) return null
  return (
    <Chip
      size="small"
      label={deviceLabel}
      sx={{ bgcolor: 'rgba(15, 23, 42, 0.7)', color: 'common.white', backdropFilter: 'blur(4px)', fontWeight: 500 }}
    />
  )
}
