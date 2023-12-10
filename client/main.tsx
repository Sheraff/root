import { createRoot } from "react-dom/client"
import App from "~/App"

const container = document.getElementById("root")

const root = createRoot(container!)
root.render(<App />)

async function loadServiceWorker(id?: string) {
	try {
		if (!("serviceWorker" in navigator)) return
		console.log("[SW] registering...")
		const path = id ? `/sw.js?id=${id}` : "/sw.js"
		const registration = await navigator.serviceWorker.register(path, {
			scope: "/",
			type: "module",
			updateViaCache: "none",
		})
		await registration.update()
		console.log("[SW] registered.")
	} catch (e) {
		console.error("[SW] registration failed: ", e)
	}
}

window.addEventListener("load", () => loadServiceWorker(), { once: true })

if (import.meta.hot) {
	import.meta.hot.on("sw-rebuild", (data: { id: string }) => {
		console.log("[SW] Hot Module Reloading...")
		loadServiceWorker(data.id)
	})
}
