import { useQuery } from "@tanstack/react-query"
import { makeHeaders, getKey, replaceParams } from "client/api/helpers"

export function useApiQuery({ url, method }, data, options) {
	return useQuery({
		...options,
		queryKey: getKey(url, method, data),
		async queryFn() {
			// Params are placed in the pathname
			const replaced = replaceParams(url, data?.Params ?? {})
			// Querystring is placed in the search params
			const withBody = data?.Querystring
				? `${replaced}?${new URLSearchParams(data.Querystring).toString()}`
				: replaced
			// Headers are placed in the headers
			const headers = makeHeaders(data?.Headers)
			const response = await fetch(withBody, { method, headers })
			const result = await response.json().catch(() => {})
			if (response.status < 200 || response.status >= 300) throw result
			return result
		},
	})
}
