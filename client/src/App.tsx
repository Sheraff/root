import { fooBar } from "@shared/foo/bar"
import { useEffect, useState } from "react"

function LoggedIn({ session }: { session: object }) {
	const [state, setState] = useState<unknown>()
	useEffect(() => {
		fetch("/api/protected")
			.then((res) => res.json())
			.then(setState)
			.catch((e) => {
				console.error(e)
				setState({ error: String(e) })
			})
	}, [])
	return (
		<>
			<div>Logged in as {JSON.stringify(session)}</div>
			<pre>{JSON.stringify(state, null, 2)}</pre>
			<button
				onClick={async () => {
					await fetch("/api/session", { method: "DELETE" })
					window.location.reload()
				}}
			>
				Logout
			</button>
		</>
	)
}

function NotLoggedIn() {
	const [state, setState] = useState<unknown>()
	useEffect(() => {
		fooBar()
		fetch("/api/hello")
			.then((res) => res.json())
			.then(setState)
	}, [])
	return (
		<>
			<div>Not logged in</div>
			<pre>{JSON.stringify(state, null, 2)}</pre>
			<a href="/api/oauth/twitch">Login with twitch</a>
		</>
	)
}

export default function App() {
	const [session, setSession] = useState<null | object>(null)
	useEffect(() => {
		fetch("/api/session")
			.then((res) => (res.ok ? res.json() : null))
			.then(setSession)
	}, [])

	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			{session && <LoggedIn session={session} />}
			{!session && <NotLoggedIn />}
		</div>
	)
}
