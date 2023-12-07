import { createRoot } from "react-dom/client"
import App from "~/App"

const container = document.getElementById("root")

const root = createRoot(container!)
root.render(<App />)

window.addEventListener(
	"load",
	async () => {
		try {
			if (!("serviceWorker" in navigator)) return
			console.log("[SW] registering...")
			const registration = await navigator.serviceWorker.register("/sw.js", {
				scope: "/",
				type: "module",
				updateViaCache: "none",
			})
			await registration.update()
			console.log("[SW] registered.")
		} catch (e) {
			console.error("[SW] registration failed: ", e)
		}
	},
	{ once: true },
)
