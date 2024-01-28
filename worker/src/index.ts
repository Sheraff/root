import { onFetch } from "@repo/worker/onFetch"
import { CACHES } from "@repo/worker/config"
import type { Message } from "@repo/shared/workerEvents"

export {}

declare global {
	var sw: ServiceWorkerGlobalScope // eslint-disable-line no-var
}
globalThis.sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			console.debug("[SW] installing...")

			const cache = await caches.open(CACHES.assets)
			await cache.addAll(__CLIENT_ASSETS__)
			await sw.skipWaiting()

			console.debug("[SW] installed.")
		})()
	)
})

sw.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			console.debug("[SW] activating...")

			// remove caches that aren't used anymore
			const cacheNames = await caches.keys()
			const appCaches = Object.values(CACHES)
			await Promise.allSettled(
				cacheNames
					.filter((cacheName) => !appCaches.includes(cacheName))
					.map((cacheName) => caches.delete(cacheName))
			)

			// immediately claim clients to avoid de-sync
			await sw.clients.claim()

			console.debug("[SW] activated.")
		})()
	)
})

sw.addEventListener("fetch", onFetch)

sw.addEventListener("message", async (event) => {
	const data = event.data as Message
	console.debug("[SW] received message:", data)
})
