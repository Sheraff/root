import { useMutation } from "@tanstack/react-query"
import { makeHeaders, getKey, replaceParams } from "client/api/helpers"

export function useApiMutation({ url, method }, early, options) {
	return useMutation({
		...options,
		mutationKey: getKey(url, method, early),
		async mutationFn(lazy) {
			const data = { ...early, ...lazy }
			// Params are placed in the pathname
			const replaced = replaceParams(url, data?.Params ?? {})
			// Querystring is placed in the search params
			const withBody = data?.Querystring
				? `${replaced}?${new URLSearchParams(data.Querystring).toString()}`
				: replaced
			// Body is stringified and placed in the body
			const body = data?.Body ? JSON.stringify(data.Body) : undefined
			// Headers are placed in the headers
			const headers = makeHeaders(data?.Headers) ?? body ? new Headers() : undefined
			if (body) headers?.set("Content-Type", "application/json")
			const response = await fetch(withBody, {
				method,
				headers,
				body,
			})
			const result = await response.json().catch(() => {})
			if (response.status < 200 || response.status >= 300) throw result
			return result
		},
	})
}
