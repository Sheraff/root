import {
	useQuery,
	useMutation,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query"
import type { ApiRouter, marker } from "server/api"

const PREFIX = "/api"

type RouterToProxy<R extends object> = {
	[K in keyof R]: R[K] extends { [marker]: true }
		? K extends "get" | "head" | "options"
			? { query: () => UseQueryResult<R[K] extends { response?: infer R } ? R : unknown> }
			: { mutate: () => UseMutationResult<R[K] extends { response?: infer R } ? R : unknown> }
		: R[K] extends object
			? RouterToProxy<R[K]>
			: never
}

function makeTarget(path: string[]) {
	const fn = () => {}
	fn.path = path
	return fn
}

const handler: ProxyHandler<{
	path?: string[]
}> = {
	get(target, prop) {
		if (typeof prop !== "string")
			throw new TypeError(`Attributes of type ${typeof prop} do not exist on the proxy.`)
		const path = target.path ? [...target.path, prop] : [PREFIX, prop]
		return new Proxy(makeTarget(path), handler)
	},
	apply(target, thisArg, argArray) {
		if (!target.path) throw new TypeError("The proxy itself is not callable.")
		if (target.path.length < 3)
			throw new TypeError(
				"Only fully defined routes are callable: `proxy.[path].[method].[query|mutate]()`."
			)

		const path = target.path.slice(0, -2)
		const type = target.path.at(-1)!
		const method = target.path.at(-2)!
		const url = path.join("/")

		if (argArray.length > 0) {
			console.warn("arguments not yet supported", argArray, target.path)
		}

		if (type === "query") {
			return useQuery({
				queryKey: [path, method],
				queryFn: async () => {
					const res = await fetch(url, { method })
					if (!res.ok) {
						throw new Error("Network response was not ok")
					}
					return res.json()
				},
			})
		}
		if (type === "mutate") {
			return useMutation({
				mutationKey: path,
				mutationFn: async () => {
					const res = await fetch(url, { method })
					if (!res.ok) {
						throw new Error("Network response was not ok")
					}
					return res.json()
				},
			})
		}
		throw new TypeError(
			"Only fully defined routes are callable: `proxy.[path].[method].[query|mutate]()`."
		)
	},
}

export const api = new Proxy({}, handler) as RouterToProxy<ApiRouter>
