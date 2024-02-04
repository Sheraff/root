import { type QueryClient } from "@tanstack/react-query"
import { SW_CACHE_KEY, SW_UPDATE_KEY } from "client/sw/useServiceWorker"

let cleanup: (() => void) | null = null
/**
 * @see https://whatwebcando.today/articles/handling-service-worker-updates/
 */
async function loadServiceWorker(client?: QueryClient, id?: string, skip?: boolean) {
	cleanup?.()
	cleanup = null
	try {
		if (!("serviceWorker" in navigator)) return
		console.debug("[SW] registering...")
		const path = id ? `/sw.js?id=${id}` : "/sw.js"
		const registration = await navigator.serviceWorker.register(path, {
			scope: "/",
			type: "module",
			updateViaCache: "imports",
		})
		if (skip) {
			const controller = new AbortController()
			cleanup = () => controller.abort()
			await registration.update()
			if (controller.signal.aborted) return
			client?.setQueryData(SW_UPDATE_KEY, null)
			if (registration.waiting) {
				registration.waiting.postMessage({ type: "HMR" })
				const listen = registration.installing || registration.waiting
				listen.addEventListener(
					"statechange",
					() => {
						if (registration.active) {
							console.debug("[SW] registered.")
							client?.setQueryData(SW_UPDATE_KEY, null)
							client?.setQueryData(SW_CACHE_KEY, registration.active)
							controller.abort()
						}
					},
					{ signal: controller.signal }
				)
			} else if (registration.active) {
				console.debug("[SW] registered.")
				client?.setQueryData(SW_CACHE_KEY, registration.active)
			} else {
				console.error("[SW] HMR registration failed.", id)
			}
			return
		}

		// a version of the SW is waiting to be activated
		if (registration.waiting) {
			console.debug("[SW] Awaiting user confirmation to update...")
			client?.setQueryData(SW_UPDATE_KEY, registration.waiting)
		}

		// a version of the SW is already active
		if (registration.active) {
			console.debug("[SW] active.")
			client?.setQueryData(SW_CACHE_KEY, registration.active)
		}

		const controller = new AbortController()
		registration.addEventListener(
			"updatefound",
			() => {
				if (registration.installing) {
					// wait until the new Service worker is actually installed (ready to take over)
					const c = new AbortController()
					registration.installing.addEventListener(
						"statechange",
						() => {
							if (registration.waiting) {
								c.abort()
								// if there's an existing controller (previous Service Worker), show the prompt
								if (navigator.serviceWorker.controller) {
									console.debug("[SW] Awaiting user confirmation to update...")
									client?.setQueryData(SW_UPDATE_KEY, registration.waiting)
								}
							}
						},
						{ signal: c.signal }
					)
				}
			},
			{ signal: controller.signal }
		)
		cleanup = () => controller.abort()
	} catch (e) {
		console.error("[SW] registration failed: ", e)
	}
}

export function enableServiceWorker(client?: QueryClient) {
	window.addEventListener("load", () => void loadServiceWorker(client), { once: true })

	if (import.meta.hot) {
		import.meta.hot.on("sw-rebuild", (data: { id: string }) => {
			console.debug("[SW] Hot Module Reloading...")
			void loadServiceWorker(client, data.id, true)
		})
	}
}
