import { useQuery } from "@tanstack/react-query"
import type { ClientDefinition } from "server/api/helpers"
import { definition as openDefinition } from "server/api/open"
import { definition as protectedDefinition } from "server/api/protected"
import { replaceParams } from "shared/replaceParams"

type GetData = "Querystring" | "Params" | "Headers"

function makeHeaders(data?: Record<string, unknown>) {
	if (!data) return undefined
	const headers = new Headers()
	for (const key in data) {
		headers.set(key, String(data[key]))
	}
	return headers
}

function useApiQuery<Def extends ClientDefinition>(
	def: Def,
	data: keyof Def["schema"] & GetData extends never
		? null
		: {
				[Key in keyof Def["schema"] & GetData]: Def["schema"][Key]
			}
) {
	const { url, method } = def
	return useQuery({
		queryKey: [url.split("/"), method, data],
		queryFn: async () => {
			// Params are placed in the pathname
			const replaced = replaceParams(url, data?.Params ?? {})
			// Querystring is places in the search params
			const withBody = data?.Querystring
				? `${replaced}?${new URLSearchParams(data.Querystring).toString()}`
				: replaced
			// Headers are placed in the headers
			const headers = makeHeaders(data?.Headers as Record<string, unknown>)
			const response = await fetch(withBody, { method, headers })
			if (!response.ok) throw new Error("Network response was not ok")
			const result = response.json()
			if (response.status !== 200) throw new Error("Network response was not ok")
			return result as Def["schema"]["Reply"] extends { [200]: infer T } ? T : never
		},
	})
}

export function ApiDemo() {
	const { data: open } = useApiQuery(openDefinition, {
		Headers: { "x-id": "123" },
		Querystring: { id: "42" },
	})
	const { data: secret } = useApiQuery(protectedDefinition, null)

	return (
		<>
			<h2>Open</h2>
			<pre>{open ? JSON.stringify(open, null, 2) : " \n  loading\n "}</pre>
			<h2>Protected</h2>
			<pre>{secret ? JSON.stringify(secret, null, 2) : " \n  loading\n "}</pre>
		</>
	)
}
