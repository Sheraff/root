import { onFetch } from "~/onFetch"
import { CACHES } from "~/config"

declare var self: ServiceWorkerGlobalScope // eslint-disable-line no-var
export {}

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			console.log("[SW] installing...")

			const cache = await caches.open(CACHES.assets)
			await cache.add("/")
			await self.skipWaiting()

			console.log("[SW] installed.")
		})(),
	)
})

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			console.log("[SW] activating...")

			// remove caches that aren't used anymore
			const cacheNames = await caches.keys()
			const appCaches = Object.values(CACHES)
			await Promise.allSettled(
				cacheNames
					.filter((cacheName) => !appCaches.includes(cacheName))
					.map((cacheName) => caches.delete(cacheName)),
			)

			// immediately claim clients to avoid de-sync
			await self.clients.claim()

			console.log("[SW] activated.")
		})(),
	)
})

self.addEventListener("fetch", onFetch)
// self.addEventListener("message", onMessage)
