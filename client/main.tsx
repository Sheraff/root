import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRoot } from "react-dom/client"
import App from "./src/App"
import { enableServiceWorker } from "client/sw/enableServiceWorker"

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

enableServiceWorker(client)
