import { useEffect, useState } from "react"
import { useAuth } from "~/auth/useAuth"

function LoggedIn({
	userId,
	signOut,
	linkAccount,
}: {
	userId: string
	signOut: () => void
	linkAccount: (provider: string) => void
}) {
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
			<hr />
			<button onClick={signOut}>Logout</button>
			<hr />
			<div>
				<p>Link accounts</p>
				<button onClick={() => linkAccount("google")}>Google</button>
				<button onClick={() => linkAccount("spotify")}>Spotify</button>
				<button onClick={() => linkAccount("twitch")}>Twitch</button>
				<button onClick={() => linkAccount("discord")}>Discord</button>
			</div>
			<hr />
			<pre>{JSON.stringify(state, null, 2)}</pre>
		</>
	)
}

function CreateAccount({ createAccount }: { createAccount: (provider: string) => void }) {
	return (
		<>
			<div>Create Account</div>
			<button onClick={() => createAccount("google")}>Google</button>
			<button onClick={() => createAccount("spotify")}>Spotify</button>
			<button onClick={() => createAccount("twitch")}>Twitch</button>
			<button onClick={() => createAccount("discord")}>Discord</button>
		</>
	)
}

function NotLoggedIn({
	submitInviteCode,
	signIn,
}: {
	submitInviteCode: (code: string) => void
	signIn: (provider: string) => void
}) {
	return (
		<>
			<div>Not logged in</div>
			<hr />
			<div>Sign up with invite code</div>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					const code = event.currentTarget.code.value
					submitInviteCode(code)
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
			<hr />
			<div>Sign in</div>
			<button onClick={() => signIn("google")}>Google</button>
			<button onClick={() => signIn("spotify")}>Spotify</button>
			<button onClick={() => signIn("twitch")}>Twitch</button>
			<button onClick={() => signIn("discord")}>Discord</button>
		</>
	)
}

export default function App() {
	const state = useAuth()

	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			{state.type === "signed-in" && (
				<>
					<LoggedIn
						userId={state.userId}
						signOut={state.signOut}
						linkAccount={state.linkAccount}
					/>
				</>
			)}
			{state.type === "creating-account" && (
				<>
					<CreateAccount createAccount={state.createAccount} />
				</>
			)}
			{state.type === "unauthenticated" && (
				<>
					<NotLoggedIn
						submitInviteCode={state.submitInviteCode}
						signIn={state.signIn}
					/>
				</>
			)}
		</div>
	)
}
