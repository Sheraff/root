import { type QueryClient } from "@tanstack/react-query"
import { SW_CACHE_KEY } from "client/sw/useServiceWorker"

async function loadServiceWorker(client?: QueryClient, id?: string) {
	try {
		if (!("serviceWorker" in navigator)) return
		console.debug("[SW] registering...")
		const path = id ? `/sw.js?id=${id}` : "/sw.js"
		const registration = await navigator.serviceWorker.register(path, {
			scope: "/",
			type: "module",
			updateViaCache: "none",
		})
		await registration.update()
		if (registration.active) {
			console.debug("[SW] registered.")
			client?.setQueryData(SW_CACHE_KEY, registration.active)
		} else {
			console.warn("[SW] registration never became active.")
		}
	} catch (e) {
		console.error("[SW] registration failed: ", e)
	}
}


export function enableServiceWorker(client?: QueryClient) {
	window.addEventListener("load", () => loadServiceWorker(client), { once: true })

	if (import.meta.hot) {
		import.meta.hot.on("sw-rebuild", (data: { id: string }) => {
			console.debug("[SW] Hot Module Reloading...")
			loadServiceWorker(client, data.id)
		})
	}
}