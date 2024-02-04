import { QueryClient } from "@tanstack/react-query"

export const client = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 5 * 60 * 1000,
		},
	},
})
