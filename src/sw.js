/// <reference lib="webworker" />
import { set } from 'idb-keyval'
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { SHARE_KEY } from './lib/shareKeys.js'

// --- Share Target -----------------------------------------------------------
// Registered before Workbox's listeners so the POST is handled here first.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return

  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData()
        const files = form.getAll('files').filter((f) => f instanceof File && f.size > 0)
        await set(SHARE_KEY, {
          files,
          title: String(form.get('title') || ''),
          text: String(form.get('text') || ''),
          url: String(form.get('url') || ''),
          receivedAt: Date.now(),
        })
      } catch (err) {
        console.error('[sw] share-target failed', err)
      }
      return Response.redirect('/?shared=1', 303)
    })(),
  )
})

// --- Precache / app shell -----------------------------------------------------
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

if (import.meta.env.PROD) {
  // SPA fallback for navigations (index.html is only precached in production builds).
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/share-target/],
    }),
  )
}
