import { useApiQuery } from "client/api/useApiQuery"
import { definition as openDefinition } from "server/api/open"
import { definition as protectedDefinition } from "server/api/protected"

export function ApiDemo() {
	const open = useApiQuery(openDefinition, {
		Headers: { "x-id": "123" },
		Querystring: { id: "42" },
	})
	const secret = useApiQuery(protectedDefinition, null, {
		retry: false,
	})

	return (
		<>
			<h2>Open</h2>
			<pre>{open.data ? JSON.stringify(open.data, null, 2) : " \n  loading\n "}</pre>
			<h2>Protected</h2>
			<pre>
				{secret.error
					? JSON.stringify(secret.error, null, 2)
					: secret.data
						? JSON.stringify(secret.data, null, 2)
						: " \n  loading\n "}
			</pre>
		</>
	)
}
