import { CACHES } from "@repo/worker/config"
import indexHtml from "@repo/client/index.html"

function simpleNetworkFirst(event: FetchEvent, request: Request) {
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
		.catch(() =>
			caches.match(event.request.url, { cacheName: CACHES.assets }).then(
				(response) =>
					response ??
					new Response(indexHtml, {
						status: 200,
						headers: {
							"Content-Type": "text/html; charset=utf-8",
						},
					})
			)
		)
}

function networkFirst(event: FetchEvent, request: Request, url: URL) {
	return new Promise<Response>((resolve, reject) => {
		const controller = new AbortController()
		let cacheChecked: boolean | null = null
		let responseChecked: boolean | null = null
		let fetchResponse: Response | null = null
		let timeout: NodeJS.Timeout | null = setTimeout(
			() => {
				timeout = null
				caches.match(event.request.url, { cacheName: CACHES.assets }).then((response) => {
					if (responseChecked === true) return
					cacheChecked = false
					if (response) {
						cacheChecked = true
						controller.abort()
						resolve(response)
					} else if (url.pathname === "/") {
						cacheChecked = true
						controller.abort()
						resolve(
							new Response(indexHtml, {
								status: 200,
								headers: {
									"Content-Type": "text/html; charset=utf-8",
								},
							})
						)
					} else if (fetchResponse) {
						resolve(fetchResponse)
					}
				})
			},
			navigator.connection?.rtt !== undefined ? navigator.connection.rtt + 100 : 850
		)
		fetch(request, { signal: controller.signal })
			.then((response) => {
				responseChecked = false
				if (response.status === 200) {
					responseChecked = true
					if (timeout) clearTimeout(timeout)
					const cacheResponse = response.clone()
					caches.open(CACHES.assets).then((cache) => {
						cache.put(event.request.url, cacheResponse)
					})
					resolve(response)
				} else if (timeout) {
					clearTimeout(timeout)
					caches
						.match(event.request.url, { cacheName: CACHES.assets })
						.then((cacheResponse) => {
							if (cacheResponse) resolve(cacheResponse)
							else if (url.pathname === "/") {
								resolve(
									new Response(indexHtml, {
										status: 200,
										headers: {
											"Content-Type": "text/html; charset=utf-8",
										},
									})
								)
							} else resolve(response)
						})
				} else {
					fetchResponse = response
				}
			})
			.catch((e) => {
				if (controller.signal.aborted) return
				if (cacheChecked === false) return reject(e)
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
		(navigator.connection?.downlink !== undefined && navigator.connection?.downlink < 1) ||
		(navigator.connection?.rtt !== undefined && navigator.connection?.rtt > 750)
	) {
		event.respondWith(cacheFirst(event, request, url))
	} else if (import.meta.env.PROD) {
		event.respondWith(networkFirst(event, request, url))
	} else {
		event.respondWith(simpleNetworkFirst(event, request))
	}
}
