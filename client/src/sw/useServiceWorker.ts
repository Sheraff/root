import { useQuery } from "@tanstack/react-query"
import { type Message } from "@repo/shared/workerEvents"

export const SW_CACHE_KEY = ["sw"]

type KnownServiceWorker = Omit<ServiceWorker, "postMessage"> & {
	postMessage(message: Message, transfer?: Transferable[]): void
}

export function useServiceWorker() {
	return useQuery({
		queryKey: SW_CACHE_KEY,
		staleTime: Infinity,
		gcTime: Infinity,
		queryFn: () =>
			navigator.serviceWorker.ready.then((r) => r.active as KnownServiceWorker | null),
	})
}
