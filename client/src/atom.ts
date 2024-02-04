import { type QueryClient, useQuery } from "@tanstack/react-query"
import { client } from "client/queryClient"

const SESSION_ATOM_KEY = "session-atom"

const global: Record<string, unknown> = {}

function useAtomValue<T>(key: string, initial: T) {
	const { data } = useQuery({
		queryKey: [SESSION_ATOM_KEY, key],
		initialData: initial,
		gcTime: Infinity,
		staleTime: Infinity,
		networkMode: "offlineFirst",
	})
	return data
}

function setAtomValue<T>(
	key: string,
	value: T | ((prev: T) => T),
	sideEffects?: (value: T, queryClient: QueryClient) => void
) {
	const next = client.setQueryData<T>([SESSION_ATOM_KEY, key], value as T | ((prev?: T) => T))
	global[key] = next
	if (sideEffects) {
		sideEffects(next!, client)
	}
}

function useAtomState<T>(
	key: string,
	initial: T,
	sideEffects?: (value: T, queryClient: QueryClient) => void
) {
	return [
		useAtomValue<T>(key, initial),
		(value: T | ((prev: T) => T)) => setAtomValue<T>(key, value, sideEffects),
	] as const
}

function getAtomValue<T>(key: string) {
	if (key in global) return global[key] as T
	return client.getQueryData<T>([SESSION_ATOM_KEY, key])!
}

export function atom<T>(
	key: string,
	initial: T,
	sideEffects?: (value: T, queryClient: QueryClient) => void
) {
	global[key] = initial
	client.setQueryData<T>([SESSION_ATOM_KEY, key], initial)
	return {
		useValue: () => useAtomValue<T>(key, initial),
		setState: (value: T | ((prev: T) => T)) => setAtomValue<T>(key, value, sideEffects),
		useState: () => useAtomState<T>(key, initial, sideEffects),
		getValue: () => getAtomValue<T>(key),
	}
}
