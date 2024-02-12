import { api } from "client/api/router"

export function ApiDemo() {
	const { data: open } = api.hello.get.query({ id: "yoo" }, { headers: { "x-id": "123" } })
	const { data: secret } = api.protected.get.query(null)

	return (
		<>
			<h2>Open</h2>
			<pre>{open ? JSON.stringify(open, null, 2) : " \n  loading\n "}</pre>
			<h2>Protected</h2>
			<pre>{secret ? JSON.stringify(secret, null, 2) : " \n  loading\n "}</pre>
		</>
	)
}
