import { CACHES } from "~/config"
import indexHtml from "../../../client/index.html"

function networkFirst(event: FetchEvent, request: Request, url: URL) {
	return fetch(request)
		.then((response) => {
			if (response.status === 200) {
				const cacheResponse = response.clone()
				caches.open(CACHES.assets).then((cache) => {
					cache.put(event.request.url, cacheResponse)
				})
			}
			return response
		})
		.catch(async (e) => {
			const matchedResponse = await caches.match(event.request.url, { cacheName: CACHES.assets })
			if (matchedResponse) return matchedResponse
			console.error(new Error(`[SW] no matched response for ${event.request.url}`, { cause: e }))
			if (url.pathname === "/") {
				return new Response(indexHtml, {
					status: 200,
					headers: {
						"Content-Type": "text/html; charset=utf-8",
					},
				})
			}
			return new Response("No connection", { status: 0 })
		})
}

async function cacheFirst(event: FetchEvent, request: Request, url: URL) {
	const matchedResponse = await caches.match(event.request.url, { cacheName: CACHES.assets })
	if (matchedResponse) return matchedResponse
	if (url.pathname === "/") {
		return new Response(indexHtml, {
			status: 200,
			headers: {
				"Content-Type": "text/html; charset=utf-8",
			},
		})
	}
	return fetch(request).then((response) => {
		if (response.status === 200) {
			const cacheResponse = response.clone()
			caches.open(CACHES.assets).then((cache) => {
				cache.put(event.request.url, cacheResponse)
			})
		}
		return response
	})
}

declare global {
	interface WorkerNavigator {
		connection?: {
			downlink: number
		}
	}
}

export function defaultFetch(event: FetchEvent, request: Request, url: URL) {
	if (navigator.connection?.downlink !== undefined && navigator.connection?.downlink < 0.5) {
		event.respondWith(cacheFirst(event, request, url))
	} else {
		event.respondWith(networkFirst(event, request, url))
	}
}
