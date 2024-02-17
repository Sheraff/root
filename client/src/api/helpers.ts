import type { ClientDefinition } from "server/api/helpers"
import type { StringAsNumber } from "shared/typeHelpers"

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type Fail = 1 | 3 | 4 | 5

type SuccessCodes = StringAsNumber<`2${Digit}${Digit}`> | "2xx"
type FailCodes = StringAsNumber<`${Fail}${Digit}${Digit}`> | `${Fail}xx`

export type DefResponse<Def extends ClientDefinition> = Def["schema"]["Reply"][SuccessCodes &
	keyof Def["schema"]["Reply"]]
export type DefError<Def extends ClientDefinition> = Def["schema"]["Reply"][FailCodes &
	keyof Def["schema"]["Reply"]]

export function makeHeaders(data?: Record<string, unknown>) {
	if (!data) return undefined
	// TS doesn't like Headers being constructed with arbitrary data, but `Headers` will stringify every value.
	const headers = new Headers(data as Record<string, string>)
	return headers
}

const DB_KEY = "__typed_api__"

export function getKey(url: string, method: string, data?: object | null) {
	return [DB_KEY, url.split("/").slice(1), method, data ?? {}]
}
