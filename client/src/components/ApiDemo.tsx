import { api } from "client/api/router"

export function ApiDemo() {
	const { data: open } = api.hello.get.query()
	const { data: secret } = api.protected.get.query()

	return (
		<>
			<h2>Open</h2>
			<pre>{open ? JSON.stringify(open, null, 2) : " \n  loading\n "}</pre>
			<h2>Protected</h2>
			<pre>{secret ? JSON.stringify(secret, null, 2) : " \n  loading\n "}</pre>
		</>
	)
}
