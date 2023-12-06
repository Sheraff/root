import { CACHES } from "~/config"

const STATIC_OFFLINE_PAGE = `
<body>
	<p>This content is served while you are offline
	<p><button onclick="window.location.reload()">reload page</button>
</body>
`

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
				console.error(new Error(`SW: no matched response for ${event.request.url}`, { cause: e }))
				return new Response(STATIC_OFFLINE_PAGE, {
					status: 200,
					headers: {
						"Content-Type": "text/html; charset=utf-8",
					},
				})
			}),
	)
}
