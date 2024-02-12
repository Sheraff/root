import { useQuery } from "@tanstack/react-query"
import { api } from "client/api/router"
import type { ClientDefinition } from "server/api/next/helpers"
import { definition } from "server/api/next/open"
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
	const { data: open } = api.hello.get.query({ id: "yoo" }, { headers: { "x-id": "123" } })
	const { data: secret } = api.protected.get.query(null)

	const { data: next } = useApiQuery(definition, {
		Headers: { "x-id": "123" },
		Querystring: { id: "yoo" },
	})

	return (
		<>
			<h2>Open</h2>
			<pre>{open ? JSON.stringify(open, null, 2) : " \n  loading\n "}</pre>
			<h2>Protected</h2>
			<pre>{secret ? JSON.stringify(secret, null, 2) : " \n  loading\n "}</pre>
			<h2>Next</h2>
			<pre>{next ? JSON.stringify(next, null, 2) : " \n  loading\n "}</pre>
		</>
	)
}
