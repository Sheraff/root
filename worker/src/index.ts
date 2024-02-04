import { onFetch } from "worker/onFetch"
import { CACHES } from "worker/config"
import type { Message } from "shared/workerEvents"

export {}

declare global {
	const sw: ServiceWorkerGlobalScope

	interface WorkerNavigator {
		connection?: {
			downlink: number
			rtt: number
		}
	}
}
// @ts-expect-error -- forcing here so it's available everywhere
globalThis.sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			console.debug("[SW] installing...")

			const cache = await caches.open(CACHES.assets)
			await cache.addAll(__CLIENT_ASSETS__)

			console.debug("[SW] installed.")
		})()
	)
})

let activationType: "prod" | "hmr" = import.meta.env.DEV ? "hmr" : "prod"
sw.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			// remove caches that aren't used anymore
			console.debug("[SW] updating cache...")
			const cacheNames = await caches.keys()
			const appCaches = Object.values(CACHES)
			await Promise.allSettled(
				cacheNames
					.filter((cacheName) => !appCaches.includes(cacheName))
					.map((cacheName) => caches.delete(cacheName))
			)

			// immediately claim clients to avoid de-sync
			console.debug("[SW] claiming clients...")
			if (activationType === "prod") {
				await sw.clients.claim()
				const tabs = await sw.clients.matchAll({
					type: "window",
					includeUncontrolled: false,
				})
				for (const tab of tabs) {
					void tab.navigate(tab.url)
				}
			} else {
				await sw.clients.claim()
			}

			console.debug("[SW] activated.")
		})()
	)
})

sw.addEventListener("fetch", onFetch)

sw.addEventListener("message", (event) => {
	const data = event.data as Message
	if (data.type === "UPDATE") {
		activationType = "prod"
		sw.skipWaiting().catch(console.error)
	} else if (data.type === "HMR") {
		activationType = "hmr"
		sw.skipWaiting().catch(console.error)
	} else {
		console.debug("[SW] received message:", data)
	}
})
