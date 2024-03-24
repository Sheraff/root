import { useApiQuery } from "client/api/useApiQuery"
import type { Provider } from "client/auth/providers"
import { useAuthContext } from "client/auth/useAuthContext"
import { Title } from "client/components/Bento/Title"
import { Button, ButtonList } from "client/components/Button/Button"
import { Divider } from "client/components/Divider/Divider"
import type { CSSProperties } from "react"
import { definition as accountsDefinition } from "server/api/routes/accounts"

export function UserAccountDemo() {
	return (
		<>
			<Title
				icon="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWxvY2sta2V5aG9sZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxNiIgcj0iMSIvPjxyZWN0IHg9IjMiIHk9IjEwIiB3aWR0aD0iMTgiIGhlaWdodD0iMTIiIHJ4PSIyIi8+PHBhdGggZD0iTTcgMTBWN2E1IDUgMCAwIDEgMTAgMHYzIi8+PC9zdmc+"
				title="Authentication"
			/>
			<Divider full />
			<DynamicAuthContent />
		</>
	)
}

const DynamicAuthContent = () => {
	const auth = useAuthContext()

	if (!auth.providers.length) {
		return <p>No OAuth API keys specified in the .env file, auth is disabled.</p>
	}

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
			<p>Create Account</p>
			<ButtonList>
				{providers.map((provider) => (
					<Button
						key={provider.key}
						onClick={() => createAccount(provider.key)}
						style={
							{
								"--button-bg": provider.color,
								"--button-border": provider.color,
							} as CSSProperties
						}
					>
						{provider.name}
					</Button>
				))}
			</ButtonList>
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
			<p>Not logged in</p>
			<Divider />
			<p>Sign up with invite code</p>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					const code = (event.currentTarget.code as HTMLInputElement).value
					void submitInviteCode(code)
				}}
			>
				<ButtonList>
					<input type="text" name="code" required minLength={17} maxLength={17} />
					<Button type="submit">Submit</Button>
				</ButtonList>
			</form>
			<Divider />
			<p>Sign in</p>
			<ButtonList>
				{providers.map((provider) => (
					<Button
						key={provider.key}
						onClick={() => signIn(provider.key)}
						style={
							{
								"--button-bg": provider.color,
								"--button-border": provider.color,
							} as CSSProperties
						}
					>
						{provider.name}
					</Button>
				))}
			</ButtonList>
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
			<p>Logged in as {userId}</p>
			<Divider />
			<Button onClick={() => void signOut()}>Logout</Button>
			<Divider />
			<p>Link accounts</p>
			<ButtonList>
				{providers.map((provider) => (
					<Button
						key={provider.key}
						onClick={() => void linkAccount(provider.key)}
						style={
							{
								"--button-bg": provider.color,
								"--button-border": provider.color,
							} as CSSProperties
						}
						disabled={
							accounts.isLoading || accounts.data?.accounts.includes(provider.key)
						}
					>
						{provider.name}
					</Button>
				))}
			</ButtonList>
		</>
	)
}
