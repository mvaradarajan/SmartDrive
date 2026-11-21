// Tags are stored in appProperties.tags as a comma-separated lowercase slug string.
// Drive limits each appProperties key+value to 124 bytes (UTF-8).

export const APP_PROPERTY_LIMIT = 124
const encoder = new TextEncoder()

export function slugifyTag(raw) {
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** @param {string | undefined} value @returns {string[]} */
export function parseTags(value) {
  if (!value) return []
  return [...new Set(value.split(',').map(slugifyTag).filter(Boolean))]
}

/** @param {string[]} tags */
export function serializeTags(tags) {
  return [...new Set(tags.map(slugifyTag).filter(Boolean))].join(',')
}

export function appPropertyBytes(key, value) {
  return encoder.encode(key).length + encoder.encode(value).length
}

export function fitsAppProperty(key, value) {
  return appPropertyBytes(key, value) <= APP_PROPERTY_LIMIT
}

/** Whether adding `tag` keeps the tags property within Drive's byte limit. */
export function canAddTag(tags, tag) {
  return fitsAppProperty('tags', serializeTags([...tags, tag]))
}
