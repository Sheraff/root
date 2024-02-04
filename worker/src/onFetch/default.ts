import { CACHES } from "worker/config"
import indexHtml from "client/index.html"

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
	if (import.meta.env.PROD) {
		console.warn("[SW] onFetch > default > cacheFirst: cache miss", event.request.url)
	}
	const response = fetch(request)
	return response
}

async function networkFirst(event: FetchEvent, request: Request, url: URL) {
	const fController = new AbortController()
	const tController = new AbortController()
	return new Promise<Response>((resolve) => {
		const f = fetch(request, { signal: fController.signal }).then((response) => {
			if (response.ok) {
				const clone = response.clone()
				resolve(response)
				tController.abort()
				if (import.meta.env.PROD) {
					caches
						.open(CACHES.assets)
						.then((cache) => cache.put(event.request.url, clone))
						.catch(console.error)
				}
			}
			return response
		})
		const cacheFallbackTimeout =
			navigator.connection?.rtt !== undefined ? navigator.connection.rtt + 100 : 850
		const t = new Promise((r) => setTimeout(r, cacheFallbackTimeout)).then(() => {
			if (tController.signal.aborted) return
			return caches
				.match(event.request.url, { cacheName: CACHES.assets })
				.then((response) => {
					if (tController.signal.aborted) return
					console.log("timed out", Boolean(response))
					if (response) {
						resolve(response)
						fController.abort()
					}
				})
		})
		Promise.allSettled([f, t])
			.then(() => {
				if (fController.signal.aborted || tController.signal.aborted) return
				if (url.pathname === "/") {
					resolve(
						new Response(indexHtml, {
							status: 200,
							headers: {
								"Content-Type": "text/html; charset=utf-8",
							},
						})
					)
				} else {
					console.warn(
						"[SW] onFetch > default > networkFirst: cache miss",
						event.request.url
					)
					resolve(f)
				}
			})
			.catch(console.error)
	})
}

// function isBadConnection() {
// 	// slow download speed
// 	if (navigator.connection?.downlink !== undefined && navigator.connection?.downlink < 1) {
// 		return true
// 	}
// 	// long round trip time
// 	if (navigator.connection?.rtt !== undefined && navigator.connection?.rtt > 750) {
// 		return true
// 	}
// 	return false
// }

export function defaultFetch(event: FetchEvent, request: Request, url: URL) {
	if (import.meta.env.DEV) {
		event.respondWith(networkFirst(event, request, url))
		// } else if (isBadConnection()) {
		// 	event.respondWith(cacheFirst(event, request, url))
		// } else if (url.pathname === "/") {
		// 	event.respondWith(networkFirst(event, request, url))
	} else {
		event.respondWith(cacheFirst(event, request, url))
	}
}
