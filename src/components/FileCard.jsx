import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useAuthedImage } from '../hooks/useAuthedImage.js'
import { parseTags } from '../lib/tags.js'
import { DeviceBadge } from './DeviceBadge.jsx'

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** @param {{ file: import('../lib/drive.js').VaultFile, onOpen: () => void, onTagClick: (tag: string) => void }} props */
export default function FileCard({ file, onOpen, onTagClick }) {
  const { ref, src, error, isImage } = useAuthedImage(file)
  const props = file.appProperties || {}
  const tags = parseTags(props.tags)

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardActionArea
        onClick={onOpen}
        aria-label={`Open ${file.name}`}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}
      >
        <Box
          ref={ref}
          sx={{
            position: 'relative',
            aspectRatio: '4 / 3',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {isImage && src && !error ? (
            <Box
              component="img"
              src={src}
              alt={file.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            />
          ) : isImage && !error ? (
            <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0, height: '100%' }} />
          ) : (
            <InsertDriveFileIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          )}
          <Box sx={{ position: 'absolute', left: 8, top: 8 }}>
            <DeviceBadge deviceLabel={props.deviceLabel} />
          </Box>
        </Box>

        <CardContent sx={{ width: '100%', px: 1.5, pt: 1.25, pb: 0, '&:last-child': { pb: 0 } }}>
          <Typography variant="subtitle2" noWrap title={file.name}>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p">
            {dateFmt.format(new Date(file.createdTime))}
          </Typography>
          {file.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {file.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, px: 1.5, pt: 1, pb: 1.5 }}>
        {tags.length ? (
          tags.map((tag) => <Chip key={tag} size="small" label={`#${tag}`} onClick={() => onTagClick(tag)} />)
        ) : (
          <Chip size="small" variant="outlined" color="warning" label="untagged" sx={{ borderStyle: 'dashed' }} />
        )}
      </Box>
    </Card>
  )
}
