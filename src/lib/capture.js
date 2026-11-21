// Screen / camera capture helpers (frames → File objects for the upload queue).

/** getDisplayMedia exists on desktop browsers only (not Android Chrome / iOS Safari). */
export function isScreenCaptureSupported() {
  return Boolean(navigator.mediaDevices?.getDisplayMedia)
}

export function isCameraSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

function waitForFrame(video) {
  return new Promise((resolve) => {
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => resolve())
    } else if (video.readyState >= 2) {
      requestAnimationFrame(() => resolve())
    } else {
      video.addEventListener('loadeddata', () => resolve(), { once: true })
    }
  })
}

/**
 * Draws the current frame of a playing <video> into a File.
 * @param {HTMLVideoElement} video
 * @param {string} name
 * @param {string} type
 * @param {number} [quality]
 */
export async function grabFrame(video, name, type, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not capture image'))), type, quality),
  )
  return new File([blob], name, { type, lastModified: Date.now() })
}

/**
 * Asks the browser for a screen/window/tab and returns one frame as a PNG File.
 * Rejects with NotAllowedError if the user cancels the picker.
 */
export async function captureScreenshot() {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await video.play()
    await waitForFrame(video)
    return await grabFrame(video, 'screenshot.png', 'image/png')
  } finally {
    stopStream(stream)
  }
}
