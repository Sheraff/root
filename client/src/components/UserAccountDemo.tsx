import { useApiQuery } from "client/api/useApiQuery"
import type { Provider } from "client/auth/providers"
import { useAuthContext } from "client/auth/useAuthContext"
import { Button } from "client/components/Button/Button"
import { Divider } from "client/components/Divider/Divider"
import { definition as accountsDefinition } from "server/api/routes/accounts"

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
	providers: Provider[]
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
			<Divider />
			<Button onClick={cancelCreateAccount}>Cancel</Button>
		</>
	)
}

function NotLoggedIn({
	submitInviteCode,
	signIn,
	providers,
}: {
	submitInviteCode: (code: string) => Promise<unknown>
	signIn: (provider: string) => void
	providers: Provider[]
}) {
	return (
		<>
			<div>Not logged in</div>
			<Divider />
			<div>Sign up with invite code</div>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					const code = (event.currentTarget.code as HTMLInputElement).value
					void submitInviteCode(code)
				}}
			>
				<input type="text" name="code" required minLength={17} maxLength={17} />
				<Button type="submit">Submit</Button>
			</form>
			<Divider />
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
	signOut: () => Promise<unknown>
	linkAccount: (provider: string) => Promise<void>
	providers: Provider[]
}) {
	const accounts = useApiQuery(accountsDefinition, null)
	return (
		<>
			<div>Logged in as {userId}</div>
			<Divider />
			<Button onClick={() => void signOut()}>Logout</Button>
			<Divider />
			<div>
				<p>Link accounts</p>
				{providers.map((provider) => (
					<Button
						key={provider.key}
						onClick={() => void linkAccount(provider.key)}
						dark
						style={{ backgroundColor: provider.color }}
						disabled={accounts.data?.accounts.includes(provider.key)}
					>
						{provider.name}
					</Button>
				))}
			</div>
		</>
	)
}
