import { CACHES } from "~/config"
import indexHtml from "../../index.html"

export function defaultFetch(event: FetchEvent, request: Request) {
	event.respondWith(
		fetch(request)
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
				return new Response(indexHtml, {
					status: 200,
					headers: {
						"Content-Type": "text/html; charset=utf-8",
					},
				})
			}),
	)
}
