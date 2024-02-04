import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRoot } from "react-dom/client"
import App from "./src/App"
import { enableServiceWorker } from "client/sw/enableServiceWorker"
import { client } from "client/queryClient"
import { AuthProvider } from "client/auth/AuthProvider"

const container = document.getElementById("root")

const root = createRoot(container!)
root.render(
	<QueryClientProvider client={client}>
		<AuthProvider>
			<App />
		</AuthProvider>
		<ReactQueryDevtools initialIsOpen={false} />
	</QueryClientProvider>
)

enableServiceWorker(client)
