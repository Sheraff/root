import { onFetch } from "~/onFetch"
import { CACHES } from "~/config"
import type { Message } from "shared/workerEvents"

export {}

declare global {
	var sw: ServiceWorkerGlobalScope // eslint-disable-line no-var
}
globalThis.sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			console.log("[SW] installing...")

			const cache = await caches.open(CACHES.assets)
			await cache.add("/")
			await sw.skipWaiting()

			console.log("[SW] installed.")
		})(),
	)
})

sw.addEventListener("activate", (event) => {
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
			await sw.clients.claim()

			console.log("[SW] activated.")
		})(),
	)
})

sw.addEventListener("fetch", onFetch)
sw.addEventListener("message", async (event) => {
	const data = event.data as Message
	// TODO: this is not the most efficient way to do this, we'd need to know where the file is from /sw (both during dev and build)
	if (data.type === "CACHE_FILE") {
		const { url } = data.payload
		const cache = await caches.open(CACHES.assets)
		await cache.add(url)
	}
})
