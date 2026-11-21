const GENERIC_NAME = /^(image|blob|untitled|file|pasted image|screenshot|camera)(\s*\(\d+\))?(\.[a-z0-9]+)?$/i

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}

function extensionFor(mime) {
  if (!mime) return 'bin'
  return EXT_BY_MIME[mime] || mime.split('/')[1]?.split(/[+;]/)[0] || 'bin'
}

const pad = (n) => String(n).padStart(2, '0')

/** YYYY-MM-DD_HH-mm-ss.<ext> */
export function timestampName(mime, date = new Date()) {
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const t = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  return `${d}_${t}.${extensionFor(mime)}`
}

/** Keeps meaningful original names; generic clipboard names get a timestamped name. */
export function chooseFileName(file) {
  const name = file.name?.trim()
  if (name && !GENERIC_NAME.test(name)) return name
  return timestampName(file.type)
}
