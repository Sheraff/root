import { useEffect, useState } from "react"
import { type Provider } from "~/auth/providers"
import { useAuth } from "~/auth/useAuth"
import { Content } from "~/db/DbTest"
import { DbProvider } from "~/db/ParentTest"

function Demo() {
	const [protectedRes, setProtectedRes] = useState<unknown>()
	useEffect(() => {
		fetch("/api/protected")
			.then((res) => res.json())
			.then(setProtectedRes)
			.catch((e) => {
				console.error(e)
				setProtectedRes({ error: String(e) })
			})
	}, [])
	const [openRes, setOpenRes] = useState<unknown>()
	useEffect(() => {
		fetch("/api/hello")
			.then((res) => res.json())
			.then(setOpenRes)
			.catch((e) => {
				console.error(e)
				setOpenRes({ error: String(e) })
			})
	}, [])
	return (
		<>
			<h2>Open</h2>
			<pre>{JSON.stringify(openRes, null, 2)}</pre>
			<h2>Protected</h2>
			<pre>{JSON.stringify(protectedRes, null, 2)}</pre>
		</>
	)
}

function LoggedIn({
	userId,
	signOut,
	linkAccount,
	providers,
}: {
	userId: string
	signOut: () => void
	linkAccount: (provider: string) => void
	providers: Array<Provider>
}) {
	return (
		<>
			<div>Logged in as {userId}</div>
			<hr />
			<button onClick={signOut}>Logout</button>
			<hr />
			<div>
				<p>Link accounts</p>
				{providers.map((provider) => (
					<button
						key={provider.key}
						onClick={() => linkAccount(provider.key)}
						style={{ backgroundColor: provider.color, color: provider.textColor }}
					>
						{provider.name}
					</button>
				))}
			</div>
			<hr />
			<Demo />
			<hr />
			<DbProvider name={userId}>
				<Content name={userId} />
			</DbProvider>
		</>
	)
}

function CreateAccount({
	createAccount,
	cancelCreateAccount,
	providers,
}: {
	createAccount: (provider: string) => void
	cancelCreateAccount: () => void
	providers: Array<Provider>
}) {
	return (
		<>
			<div>Create Account</div>
			{providers.map((provider) => (
				<button
					key={provider.key}
					onClick={() => createAccount(provider.key)}
					style={{ backgroundColor: provider.color, color: provider.textColor }}
				>
					{provider.name}
				</button>
			))}
			<hr />
			<button onClick={cancelCreateAccount}>Cancel</button>
		</>
	)
}

function NotLoggedIn({
	submitInviteCode,
	signIn,
	providers,
}: {
	submitInviteCode: (code: string) => void
	signIn: (provider: string) => void
	providers: Array<Provider>
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
			{providers.map((provider) => (
				<button
					key={provider.key}
					onClick={() => signIn(provider.key)}
					style={{ backgroundColor: provider.color, color: provider.textColor }}
				>
					{provider.name}
				</button>
			))}
			<hr />
			<Demo />
		</>
	)
}

export default function App() {
	const state = useAuth()

	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			{state.type === "signed-in" && (
				<LoggedIn
					userId={state.userId}
					signOut={state.signOut}
					linkAccount={state.linkAccount}
					providers={state.providers}
				/>
			)}
			{state.type === "creating-account" && (
				<CreateAccount
					createAccount={state.createAccount}
					cancelCreateAccount={state.cancelCreateAccount}
					providers={state.providers}
				/>
			)}
			{state.type === "unauthenticated" && (
				<NotLoggedIn
					submitInviteCode={state.submitInviteCode}
					signIn={state.signIn}
					providers={state.providers}
				/>
			)}
		</div>
	)
}
