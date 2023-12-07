import { fooBar } from "@shared/foo/bar"
import { useEffect, useState } from "react"

function getCookies() {
	const cookies = document.cookie.split(";")
	const cookieObj: Record<string, string | undefined> = {}
	cookies.forEach((cookie) => {
		const [key, value] = cookie.split("=") as [string, string | undefined]
		cookieObj[key.trim()] = value?.trim()
	})
	return cookieObj
}

export default function App() {
	const [state, setState] = useState<unknown>()
	useEffect(() => {
		fooBar()
		// fetch("/api/hello")
		// 	.then((res) => res.json())
		// 	.then(setState)
	}, [])

	useEffect(() => {
		const cookies = getCookies()
		if ("user" in cookies) {
			fetch("/api/protected")
				.then((res) => res.json())
				.then(setState)
				.catch((e) => {
					console.error(e)
					setState({ error: String(e) })
				})
		}
	}, [])

	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			<pre>{JSON.stringify(state, null, 2)}</pre>
		</div>
	)
}
