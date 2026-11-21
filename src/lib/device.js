/** Short OS label stored in appProperties.deviceLabel. */
export function detectDeviceLabel() {
  const ua = navigator.userAgent || ''
  const platform = navigator.userAgentData?.platform || ''
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iOS'
  if (/Android/i.test(ua) || platform === 'Android') return 'Android'
  if (/CrOS/.test(ua) || platform === 'Chrome OS') return 'ChromeOS'
  if (/Windows/.test(ua) || platform === 'Windows') return 'Windows'
  if (/Mac OS X|Macintosh/.test(ua) || platform === 'macOS') return 'macOS'
  if (/Linux/.test(ua) || platform === 'Linux') return 'Linux'
  return 'Web'
}
