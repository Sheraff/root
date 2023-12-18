import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRoot } from "react-dom/client"
import App from "~/App"

const client = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 5 * 60 * 1000,
		},
	},
})

const container = document.getElementById("root")

const root = createRoot(container!)
root.render(
	<QueryClientProvider client={client}>
		<App />
		<ReactQueryDevtools initialIsOpen={false} />
	</QueryClientProvider>,
)

async function loadServiceWorker(id?: string) {
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
		console.debug("[SW] registered.")
	} catch (e) {
		console.error("[SW] registration failed: ", e)
	}
}

window.addEventListener("load", () => loadServiceWorker(), { once: true })

if (import.meta.hot) {
	import.meta.hot.on("sw-rebuild", (data: { id: string }) => {
		console.debug("[SW] Hot Module Reloading...")
		loadServiceWorker(data.id)
	})
}
