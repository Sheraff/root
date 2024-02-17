import { useMutation, useQuery } from "@tanstack/react-query"
import { type Message } from "shared/workerEvents"

const DB_KEY = "__service_worker__"

export const SW_CACHE_KEY = [DB_KEY, "ready"]

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

export const SW_UPDATE_KEY = [DB_KEY, "update"]

export function useServiceWorkerUpdate() {
	const { data: waiting } = useQuery({
		queryKey: SW_UPDATE_KEY,
		staleTime: Infinity,
		gcTime: Infinity,
		queryFn: () =>
			navigator.serviceWorker
				.getRegistration()
				.then((r) => (r?.waiting ?? null) as KnownServiceWorker | null),
	})
	const { mutate: update } = useMutation({
		mutationFn: () => {
			waiting?.postMessage({ type: "UPDATE" })
			return new Promise(() => {})
		},
		mutationKey: SW_UPDATE_KEY,
	})
	return [Boolean(waiting), update] as [can_update: boolean, update: () => void]
}
