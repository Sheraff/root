import { defaultFetch } from "sw/onFetch/default"

export function onFetch(event: FetchEvent) {
	const request = event.request

	if (request.headers.get("cache") === "no-store") {
		return
	}

	if (request.method === "GET") {
		const url = new URL(request.url)

		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return
		}

		if (url.pathname.startsWith("/api")) {
			return
		}

		defaultFetch(event, request, url)
	}
}
