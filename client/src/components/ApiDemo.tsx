import { useApiMutation } from "client/api/useApiMutation"
import { useApiQuery } from "client/api/useApiQuery"
import { Title } from "client/components/Bento/Title"
import { Button } from "client/components/Button/Button"
import { Divider } from "client/components/Divider/Divider"
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
			<Title
				icon="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNhYmxlIj48cGF0aCBkPSJNNCA5YTIgMiAwIDAgMS0yLTJWNWg2djJhMiAyIDAgMCAxLTIgMloiLz48cGF0aCBkPSJNMyA1VjMiLz48cGF0aCBkPSJNNyA1VjMiLz48cGF0aCBkPSJNMTkgMTVWNi41YTMuNSAzLjUgMCAwIDAtNyAwdjExYTMuNSAzLjUgMCAwIDEtNyAwVjkiLz48cGF0aCBkPSJNMTcgMjF2LTIiLz48cGF0aCBkPSJNMjEgMjF2LTIiLz48cGF0aCBkPSJNMjIgMTloLTZ2LTJhMiAyIDAgMCAxIDItMmgyYTIgMiAwIDAgMSAyIDJaIi8+PC9zdmc+"
				title="API"
			/>
			<Divider full />
			<h3>Open</h3>
			<pre>{open.data ? JSON.stringify(open.data, null, 2) : " \n  loading\n "}</pre>
			<h3>Protected</h3>
			<pre>
				{secret.error
					? JSON.stringify(secret.error, null, 2)
					: secret.data
						? JSON.stringify(secret.data, null, 2)
						: " \n  loading\n "}
			</pre>
			<h3>Mutation</h3>
			<Button
				disabled={save.isPending || save.isSuccess}
				onClick={() => save.mutate({ Body: { hello: "world", moo: 42 } })}
			>
				{save.isPending ? "mutating..." : save.isSuccess ? "ok" : "Save"}
			</Button>
		</>
	)
}
