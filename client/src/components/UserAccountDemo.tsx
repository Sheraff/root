import type { Provider } from "client/auth/providers"
import { useAuthContext } from "client/auth/useAuthContext"
import { Button } from "client/components/Button/Button"

export function UserAccountDemo() {
	const auth = useAuthContext()

	switch (auth.type) {
		case "signed-in":
			return (
				<LoggedIn
					userId={auth.userId}
					signOut={auth.signOut}
					linkAccount={auth.linkAccount}
					providers={auth.providers}
				/>
			)
		case "creating-account":
			return (
				<CreateAccount
					createAccount={auth.createAccount}
					cancelCreateAccount={auth.cancelCreateAccount}
					providers={auth.providers}
				/>
			)
		case "unauthenticated":
			return (
				<NotLoggedIn
					submitInviteCode={auth.submitInviteCode}
					signIn={auth.signIn}
					providers={auth.providers}
				/>
			)
		default:
			return null
	}
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
				<Button
					key={provider.key}
					onClick={() => createAccount(provider.key)}
					dark
					style={{ backgroundColor: provider.color }}
				>
					{provider.name}
				</Button>
			))}
			<hr />
			<Button onClick={cancelCreateAccount}>Cancel</Button>
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
				<input type="text" name="code" required minLength={17} maxLength={17} />
				<Button type="submit">Submit</Button>
			</form>
			<hr />
			<div>Sign in</div>
			{providers.map((provider) => (
				<Button
					key={provider.key}
					onClick={() => signIn(provider.key)}
					dark
					style={{ backgroundColor: provider.color }}
				>
					{provider.name}
				</Button>
			))}
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
			<Button onClick={signOut}>Logout</Button>
			<hr />
			<div>
				<p>Link accounts</p>
				{providers.map((provider) => (
					<Button
						key={provider.key}
						onClick={() => linkAccount(provider.key)}
						dark
						style={{ backgroundColor: provider.color }}
					>
						{provider.name}
					</Button>
				))}
			</div>
		</>
	)
}
