import { CACHES } from "~/config"
import indexHtml from "../../../client/index.html"

function networkFirst(event: FetchEvent, request: Request, url: URL) {
	return new Promise<Response>((resolve) => {
		const controller = new AbortController()
		const timeout = setTimeout(
			() => {
				caches.match(event.request.url, { cacheName: CACHES.assets }).then((response) => {
					if (response) {
						controller.abort()
						resolve(response)
					} else if (url.pathname === "/") {
						controller.abort()
						resolve(
							new Response(indexHtml, {
								status: 200,
								headers: {
									"Content-Type": "text/html; charset=utf-8",
								},
							}),
						)
					}
				})
			},
			navigator.connection?.rtt !== undefined
				? Math.min(navigator.connection.rtt + 100, 1000)
				: 1000,
		)
		fetch(request, { signal: controller.signal }).then((response) => {
			if (response.status === 200) {
				clearTimeout(timeout)
				const cacheResponse = response.clone()
				caches.open(CACHES.assets).then((cache) => {
					cache.put(event.request.url, cacheResponse)
				})
				resolve(response)
			} else {
				caches
					.match(event.request.url, { cacheName: CACHES.assets })
					.then((cacheResponse) => !controller.signal.aborted && resolve(cacheResponse ?? response))
			}
		})
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
			rtt: number
		}
	}
}

export function defaultFetch(event: FetchEvent, request: Request, url: URL) {
	if (
		(navigator.connection?.downlink !== undefined && navigator.connection?.downlink < 0.5) ||
		(navigator.connection?.rtt !== undefined && navigator.connection?.rtt > 1000)
	) {
		event.respondWith(cacheFirst(event, request, url))
	} else {
		event.respondWith(networkFirst(event, request, url))
	}
}
