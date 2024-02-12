import {
	useQuery,
	useMutation,
	type UseMutationResult,
	type UseQueryResult,
	type UseQueryOptions,
	type UseMutationOptions,
} from "@tanstack/react-query"
import type { ApiRouter, marker } from "server/api"

const PREFIX = "/api"

type Query<Schema extends object, Res = Schema extends { response?: infer R } ? R : unknown> = <
	Selected = Res,
>(
	params: Schema extends { querystring?: infer Q } ? Q : null,
	options?: Omit<UseQueryOptions<Res, unknown, Selected>, "queryKey" | "queryFn"> &
		(Schema extends { headers?: infer H } ? { headers: H } : object)
) => UseQueryResult<Selected, unknown>

type Mutate<
	Schema extends object,
	Vars = Schema extends { querystring?: infer Q } ? Q : null,
	Res = Schema extends { response?: infer R } ? R : unknown,
> = (
	options?: Omit<UseMutationOptions<Res, unknown, Vars>, "mutationKey" | "mutationFn"> &
		(Schema extends { headers?: infer H } ? { headers: H } : object)
) => UseMutationResult<Res, unknown, Vars>

type RouterToProxy<R extends object> = {
	[K in keyof R]: R[K] extends { [marker]: true }
		? K extends "get" | "head" | "options"
			? { query: Query<R[K]> }
			: { mutate: Mutate<R[K]> }
		: R[K] extends object
			? RouterToProxy<R[K]>
			: never
}

function makeTarget(path: string[]) {
	const fn = () => {}
	fn.path = path
	return fn
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- hard to do on a generic proxy */
const handler: ProxyHandler<{
	path?: string[]
}> = {
	get(target, prop) {
		if (typeof prop !== "string")
			throw new TypeError(`Attributes of type ${typeof prop} do not exist on the proxy.`)
		const path = target.path ? [...target.path, prop] : [PREFIX, prop]
		return new Proxy(makeTarget(path), handler)
	},
	apply(target, thisArg, argArray = []) {
		if (!target.path) throw new TypeError("The proxy itself is not callable.")
		if (target.path.length < 3)
			throw new TypeError(
				"Only fully defined routes are callable: `proxy.[path].[method].[query|mutate]()`."
			)

		const path = target.path.slice(0, -2)
		const type = target.path.at(-1)!
		const method = target.path.at(-2)!
		const url = path.join("/")

		if (type === "query") {
			const [params, { headers = undefined, ...options } = {}] = argArray
			return useQuery({
				...options,
				queryKey: [path, method, params, headers],
				queryFn: async () => {
					const withParams = params
						? `${url}?${new URLSearchParams(params).toString()}`
						: url
					const res = await fetch(withParams, { method, headers })
					if (!res.ok) {
						throw new Error("Network response was not ok")
					}
					return res.json()
				},
			})
		}
		if (type === "mutate") {
			const [{ headers = undefined, ...options } = {}] = argArray
			return useMutation({
				...options,
				mutationKey: [path, method, headers],
				mutationFn: async (params: any) => {
					const withParams = params
						? `${url}?${new URLSearchParams(params).toString()}`
						: url
					const res = await fetch(withParams, { method, headers })
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
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

export const api = new Proxy({}, handler) as RouterToProxy<ApiRouter>
