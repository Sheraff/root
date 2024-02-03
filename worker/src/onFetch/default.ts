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
	console.warn("[SW] onFetch > default > cacheFirst: cache miss", event.request.url)
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

export function defaultFetch(event: FetchEvent, request: Request, url: URL) {
	event.respondWith(cacheFirst(event, request, url))
}
