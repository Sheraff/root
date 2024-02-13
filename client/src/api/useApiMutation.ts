import { type UseMutationOptions, useMutation } from "@tanstack/react-query"
import { makeHeaders, type DefError, type DefResponse, getKey } from "client/api/helpers"
import type { ClientDefinition } from "server/api/helpers"
import { replaceParams } from "shared/replaceParams"
import type { Prettify } from "shared/typeHelpers"

type MutData = "Querystring" | "Params" | "Headers" | "Body"

type DefVariables<Def extends ClientDefinition> =
	object extends Prettify<Pick<Def["schema"], MutData & keyof Def["schema"]>>
		? null
		: Prettify<Pick<Def["schema"], MutData & keyof Def["schema"]>>

type MissingKeys<from, provided extends Partial<from>> = from extends object
	? object extends provided
		? from
		: Pick<
				from,
				{
					[key in keyof from]: key extends keyof provided ? never : key
				}[keyof from]
			>
	: void

export function useApiMutation<
	Def extends ClientDefinition,
	Early extends Partial<DefVariables<Def>> = object,
>(
	{ url, method }: Def,
	early?: Early | null,
	options?: Omit<
		UseMutationOptions<
			Prettify<DefResponse<Def>>,
			Prettify<DefError<Def>>,
			Prettify<MissingKeys<DefVariables<Def>, Early>>
		>,
		"mutationKey" | "mutationFn"
	>
) {
	return useMutation<
		Prettify<DefResponse<Def>>,
		Prettify<DefError<Def>>,
		Prettify<MissingKeys<DefVariables<Def>, Early>>
	>({
		...options,
		mutationKey: getKey(url, method, early),
		async mutationFn(lazy: Prettify<MissingKeys<DefVariables<Def>, Early>>) {
			const data = { ...early, ...lazy } as unknown as DefVariables<Def>
			// Params are placed in the pathname
			const replaced = replaceParams(url, data?.Params ?? {})
			// Querystring is placed in the search params
			const withBody = data?.Querystring
				? `${replaced}?${new URLSearchParams(data.Querystring).toString()}`
				: replaced
			// Body is stringified and placed in the body
			const body = data?.Body ? JSON.stringify(data.Body) : undefined
			// Headers are placed in the headers
			const headers =
				makeHeaders(data?.Headers as Record<string, unknown>) ?? body
					? new Headers()
					: undefined
			if (body) headers?.set("Content-Type", "application/json")
			const response = await fetch(withBody, {
				method,
				headers,
				body,
			})
			const result = await response.json().catch(() => {})
			if (response.status < 200 || response.status >= 300) throw result
			return result as Prettify<DefResponse<Def>>
		},
	})
}
