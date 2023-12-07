import { fooBar } from "@shared/foo/bar"
import { useEffect, useState } from "react"

function LoggedIn() {
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
			<div>Logged in</div>
			<button onClick={async () => fetch("/api/session", { method: "DELETE" })}>Logout</button>
			<pre>{JSON.stringify(state, null, 2)}</pre>
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
			<a href="/api/oauth/twitch">Login with twitch</a>
			<pre>{JSON.stringify(state, null, 2)}</pre>
		</>
	)
}

function getCookies() {
	const cookies = document.cookie.split(";")
	const cookieObj: Record<string, string | undefined> = {}
	cookies.forEach((cookie) => {
		const [key, value] = cookie.split("=") as [string, string | undefined]
		cookieObj[key.trim()] = value?.trim()
	})
	return cookieObj
}

declare global {
	interface Window {
		cookieStore?: EventTarget
	}
}

export default function App() {
	const [allowed, setAllowed] = useState<boolean>(() =>
		navigator.onLine ? false : "user" in getCookies(),
	)
	const [loading, setLoading] = useState(() => navigator.onLine)
	useEffect(() => {
		const controller = new AbortController()
		let online = navigator.onLine
		let checking = false
		let lastValue = getCookies().user

		const checkSession = async () => {
			console.log("checkSession", { online, checking })
			if (!online || checking) return
			checking = true
			const res = await fetch("/api/session")
			checking = false
			setAllowed(res.status !== 401)
		}

		addEventListener(
			"online",
			() => {
				online = true
				checkSession()
			},
			{ signal: controller.signal },
		)

		addEventListener(
			"offline",
			() => {
				online = false
				setAllowed("user" in getCookies())
			},
			{ signal: controller.signal },
		)

		let doubleEventTimeout: NodeJS.Timeout
		window.cookieStore?.addEventListener(
			"change",
			() => {
				clearTimeout(doubleEventTimeout)
				doubleEventTimeout = setTimeout(() => {
					const value = getCookies().user
					if (value !== lastValue) {
						lastValue = value
						checkSession()
					}
				}, 100)
			},
			{ signal: controller.signal },
		)

		if (loading) {
			checkSession().finally(() => setLoading(false))
		}

		return () => controller.abort()
	}, [])

	console.log({ allowed })

	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			{!loading && (
				<>
					{allowed && <LoggedIn />}
					{!allowed && <NotLoggedIn />}
				</>
			)}
		</div>
	)
}
