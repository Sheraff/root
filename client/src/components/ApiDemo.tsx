import { useApiMutation } from "client/api/useApiMutation"
import { useApiQuery } from "client/api/useApiQuery"
import { Button } from "client/components/Button/Button"
import { definition as openDefinition } from "server/api/routes/open"
import { definition as protectedDefinition } from "server/api/routes/protected"
import { definition as saveDefinition } from "server/api/routes/save"

export function ApiDemo() {
	const open = useApiQuery(openDefinition, {
		Headers: { "x-id": "123" },
		Querystring: { id: "42" },
	})

	const secret = useApiQuery(protectedDefinition, null, {
		retry: false,
	})

	const save = useApiMutation(saveDefinition, null, {
		onSuccess(data, variables, context) {
			console.log("Saved", data, variables, context)
			setTimeout(() => save.reset(), 1000)
		},
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
			<h2>Mutation</h2>
			<Button
				disabled={save.isPending || save.isSuccess}
				onClick={() => save.mutate({ Body: { hello: "world", moo: 42 } })}
			>
				{save.isPending ? "mutating..." : save.isSuccess ? "ok" : "Save"}
			</Button>
		</>
	)
}
