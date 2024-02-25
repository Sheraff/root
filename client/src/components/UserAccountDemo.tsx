import { useApiQuery } from "client/api/useApiQuery"
import type { Provider } from "client/auth/providers"
import { useAuthContext } from "client/auth/useAuthContext"
import { Button, ButtonList } from "client/components/Button/Button"
import { Divider } from "client/components/Divider/Divider"
import type { CSSProperties } from "react"
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
			<h2>Authentication</h2>
			<div>Create Account</div>
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
			<h2>Authentication</h2>
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
			<h2>Authentication</h2>
			<Divider full />
			<div>Logged in as {userId}</div>
			<Divider />
			<Button onClick={() => void signOut()}>Logout</Button>
			<Divider />
			<div>
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
			</div>
		</>
	)
}
