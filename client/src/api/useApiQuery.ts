import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { ClientDefinition } from "server/api/helpers"
import { replaceParams } from "shared/replaceParams"
import type { Prettify, StringAsNumber } from "shared/typeHelpers"

type GetData = "Querystring" | "Params" | "Headers"

function makeHeaders(data?: Record<string, unknown>) {
	if (!data) return undefined
	// TS doesn't like Headers being constructed with arbitrary data, but `Headers` will stringify every value.
	const headers = new Headers(data as Record<string, string>)
	return headers
}

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type Fail = 1 | 3 | 4 | 5

type SuccessCodes = StringAsNumber<`2${Digit}${Digit}`> | "2xx"
type FailCodes = StringAsNumber<`${Fail}${Digit}${Digit}`> | `${Fail}xx`

type DefResponse<Def extends ClientDefinition> = Def["schema"]["Reply"][SuccessCodes &
	keyof Def["schema"]["Reply"]]
type DefError<Def extends ClientDefinition> = Def["schema"]["Reply"][FailCodes &
	keyof Def["schema"]["Reply"]]

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
		queryKey: [url.split("/"), method, data],
		queryFn: async () => {
			// Params are placed in the pathname
			const replaced = replaceParams(url, data?.Params ?? {})
			// Querystring is placed in the search params
			const withBody = data?.Querystring
				? `${replaced}?${new URLSearchParams(data.Querystring).toString()}`
				: replaced
			// Headers are placed in the headers
			const headers = makeHeaders(data?.Headers as Record<string, unknown>)
			const response = await fetch(withBody, { method, headers })
			const result = await response.json()
			if (response.status < 200 || response.status >= 300) throw result
			return result as Prettify<DefResponse<Def>>
		},
	})
}
