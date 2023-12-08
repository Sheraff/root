import { fooBar } from "@shared/foo/bar"
import { useEffect, useState } from "react"

function LoggedIn({ userId }: { userId: string }) {
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
			<div>Logged in as {userId}</div>
			<button onClick={async () => fetch("/api/oauth/session", { method: "DELETE" })}>
				Logout
			</button>
			<pre>{JSON.stringify(state, null, 2)}</pre>
		</>
	)
}

function CreateAccount({ session }: { session: NoAccountUser["session"] }) {
	return (
		<>
			<div>
				Creating account as {session.email} with {session.provider} (id {session.id})
			</div>
			<button onClick={async () => fetch("/api/oauth/session", { method: "DELETE" })}>
				Cancel account creation
			</button>
			<form
				onSubmit={async (event) => {
					event.preventDefault()
					const code = event.currentTarget.code.value
					const res = await fetch("/api/oauth/invite", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ code }),
					})
					console.log("fetching...", res.ok, res.status, res.statusText)
					const json = await res.json()
					console.log(json)
				}}
			>
				<input
					type="text"
					name="code"
					required
					minLength={17}
					maxLength={17}
				/>
				<button type="submit">Submit</button>
			</form>
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
			<a href="/api/oauth/connect/twitch">Login with twitch</a>
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

type UnAuthenticatedUser = undefined
type NoAccountUser = { session: { id: string; email: string; provider: string } }
type AuthenticatedUser = { user: { id: string; email: string } }

export default function App() {
	const [userId, setUserId] = useState<string | undefined>(() => getCookies().user)
	const [profile, setProfile] = useState<AuthenticatedUser | NoAccountUser | UnAuthenticatedUser>()

	useEffect(() => {
		const controller = new AbortController()
		let online = navigator.onLine
		let checking = false
		let lastValue = getCookies().user

		const checkSession = async () => {
			console.log("checkSession", { online, checking })
			if (!online || checking) return
			checking = true
			const res = await fetch("/api/oauth/session")
			checking = false
			if (res.status === 401) {
				setUserId(undefined)
				setProfile(undefined)
				return
			}
			const json = (await res.json()) as AuthenticatedUser | NoAccountUser
			setProfile(json)
			if ("user" in json) {
				setUserId(json.user.id)
			} else {
				setUserId(undefined)
			}
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
				setUserId(getCookies().user)
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

		if (online) {
			checkSession()
		}

		return () => controller.abort()
	}, [])

	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			{userId && <LoggedIn userId={userId} />}
			{!userId && profile && "session" in profile && <CreateAccount session={profile.session} />}
			{!userId && !(profile && "session" in profile) && <NotLoggedIn />}
		</div>
	)
}
