import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { makeHeaders, type DefError, type DefResponse, getKey } from "client/api/helpers"
import type { ClientDefinition } from "server/api/helpers"
import { replaceParams } from "shared/replaceParams"
import type { Prettify } from "shared/typeHelpers"

type GetData = "Querystring" | "Params" | "Headers"

export function useApiQuery<Def extends ClientDefinition, T = Prettify<DefResponse<Def>>>(
	{ url, method }: Def,
	data: object extends Pick<Def["schema"], GetData & keyof Def["schema"]>
		? null
		: Prettify<Pick<Def["schema"], GetData & keyof Def["schema"]>>,
	options?: Omit<
		UseQueryOptions<Prettify<DefResponse<Def>>, Prettify<DefError<Def>>, T>,
		"queryKey" | "queryFn"
	>
) {
	return useQuery<Prettify<DefResponse<Def>>, Prettify<DefError<Def>>, T>({
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
			const headers = makeHeaders(data?.Headers as Record<string, unknown>)
			const response = await fetch(withBody, { method, headers })
			const result = response.headers.get("Content-Type")?.includes("application/json")
				? await response.json().catch(() => {})
				: await response.text().catch(() => {})
			if (response.status < 200 || response.status >= 300) throw result
			return result as Prettify<DefResponse<Def>>
		},
	})
}
