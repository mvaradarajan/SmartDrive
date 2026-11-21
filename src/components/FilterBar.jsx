import { useEffect, useState } from 'react'
import InboxIcon from '@mui/icons-material/Inbox'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

const chipSx = { flexShrink: 0, height: { xs: 44, sm: 32 } }

function Count({ children }) {
  return (
    <Box component="span" sx={{ ml: 0.75, opacity: 0.7 }}>
      {children}
    </Box>
  )
}

/**
 * @param {{
 *   filters: import('../hooks/useFilters.js').Filters,
 *   onChange: (patch: Partial<import('../hooks/useFilters.js').Filters>) => void,
 *   onReset: () => void,
 *   tagCounts: { tag: string, count: number }[],
 *   untaggedCount: number,
 * }} props
 */
export default function FilterBar({ filters, onChange, onReset, tagCounts, untaggedCount }) {
  const [text, setText] = useState(filters.search)

  // Debounce the search box into filter state.
  useEffect(() => {
    if (text === filters.search) return
    const t = setTimeout(() => onChange({ search: text }), 250)
    return () => clearTimeout(t)
  }, [text, filters.search, onChange])

  const toggleTag = (tag) => {
    const tags = filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag]
    onChange({ tags, untagged: false })
  }

  const active = filters.tags.length > 0 || filters.untagged || filters.search !== ''

  return (
    <Stack spacing={1.5}>
      <TextField
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search names and comments"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
      />

      {/* One swipeable row on phones; wraps on larger screens. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: { xs: 'nowrap', sm: 'wrap' },
          overflowX: { xs: 'auto', sm: 'visible' },
          mx: { xs: -2, sm: 0 },
          px: { xs: 2, sm: 0 },
          pb: 0.5,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: { xs: 'none', sm: 'auto' },
          '&::-webkit-scrollbar': { display: { xs: 'none', sm: 'block' } },
        }}
      >
        <Chip
          icon={<InboxIcon />}
          label={
            <>
              Untagged<Count>{untaggedCount}</Count>
            </>
          }
          clickable
          color={filters.untagged ? 'primary' : 'default'}
          variant={filters.untagged ? 'filled' : 'outlined'}
          aria-pressed={filters.untagged}
          onClick={() => onChange({ untagged: !filters.untagged, tags: [] })}
          sx={chipSx}
        />
        {tagCounts.map(({ tag, count }) => {
          const selected = filters.tags.includes(tag)
          return (
            <Chip
              key={tag}
              label={
                <>
                  #{tag}
                  <Count>{count}</Count>
                </>
              }
              clickable
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              aria-pressed={selected}
              onClick={() => toggleTag(tag)}
              sx={chipSx}
            />
          )
        })}
        {active && (
          <Button
            size="small"
            onClick={() => {
              setText('')
              onReset()
            }}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Clear filters
          </Button>
        )}
      </Box>
    </Stack>
  )
}
