import { useAuthContext } from "client/auth/useAuthContext"
import { Title } from "client/components/Bento/Title"
import { Divider } from "client/components/Divider/Divider"
import { Content } from "client/db/DbTest"

export function DbDemo() {
	const auth = useAuthContext()
	if (auth.type !== "signed-in") {
		return <div>User DB only available to signed-in users</div>
	}
	return (
		<>
			<Title
				icon="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWRhdGFiYXNlIj48ZWxsaXBzZSBjeD0iMTIiIGN5PSI1IiByeD0iOSIgcnk9IjMiLz48cGF0aCBkPSJNMyA1VjE5QTkgMyAwIDAgMCAyMSAxOVY1Ii8+PHBhdGggZD0iTTMgMTJBOSAzIDAgMCAwIDIxIDEyIi8+PC9zdmc+"
				title="Database"
			/>
			<Divider full />
			<Content name={auth.userId} />
		</>
	)
}
