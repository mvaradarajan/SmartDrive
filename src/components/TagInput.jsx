import { useState } from 'react'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import { APP_PROPERTY_LIMIT, appPropertyBytes, canAddTag, serializeTags, slugifyTag } from '../lib/tags.js'

const filterOptions = createFilterOptions({ limit: 6 })

/**
 * Tag chips + autocomplete from existing tags.
 * Enter / comma adds; Backspace on empty removes the last tag; blur commits pending text.
 */
export default function TagInput({ tags, onChange, suggestions = [], autoFocus = false }) {
  const [input, setInput] = useState('')
  const [limitHit, setLimitHit] = useState(false)

  /** Normalise a full list of raw values and enforce Drive's byte limit. */
  const commit = (values) => {
    const next = []
    let hit = false
    for (const raw of values) {
      const tag = slugifyTag(raw)
      if (!tag || next.includes(tag)) continue
      if (!tags.includes(tag) && !canAddTag(next, tag)) {
        hit = true
        continue
      }
      next.push(tag)
    }
    setLimitHit(hit)
    onChange(next)
  }

  const used = appPropertyBytes('tags', serializeTags(tags))

  return (
    <Autocomplete
      multiple
      freeSolo
      autoHighlight
      disableClearable
      filterSelectedOptions
      forcePopupIcon={false}
      options={suggestions}
      filterOptions={filterOptions}
      value={tags}
      inputValue={input}
      onChange={(_, values) => {
        setInput('')
        commit(values)
      }}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' && value.includes(',')) {
          setInput('')
          commit([...tags, ...value.split(',')])
        } else {
          setInput(value)
        }
      }}
      renderValue={(value, getItemProps) =>
        value.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index })
          return <Chip key={key} label={option} size="small" color="primary" variant="outlined" {...itemProps} />
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          placeholder={tags.length ? 'Add tag…' : 'Add tags (e.g. receipt, bug)'}
          onBlur={() => {
            if (!input.trim()) return
            setInput('')
            commit([...tags, input])
          }}
          inputProps={{
            ...params.inputProps,
            enterKeyHint: 'enter',
            autoCapitalize: 'none',
            autoCorrect: 'off',
            spellCheck: false,
          }}
          helperText={limitHit ? `Tag limit reached — Drive allows ${APP_PROPERTY_LIMIT} bytes for tags (${used} used).` : null}
          slotProps={{ formHelperText: { sx: { color: 'warning.main' } } }}
        />
      )}
    />
  )
}
