import { useAuthContext } from "client/auth/useAuthContext"
import { Title } from "client/components/Bento/Title"
import { Button } from "client/components/Button/Button"
import { Divider } from "client/components/Divider/Divider"
import { useServiceWorker, useServiceWorkerUpdate } from "client/sw/useServiceWorker"
import { useEffect } from "react"

export function ServiceWorkerDemo() {
	const { data: sw } = useServiceWorker()
	useEffect(() => {
		if (!sw) return
		sw.postMessage({
			type: "FOO",
			payload: {
				foo: "hello SW! from client",
			},
		})
	}, [sw])

	const [shouldUpdate, update] = useServiceWorkerUpdate()

	const auth = useAuthContext()
	const signedIn = auth.type === "signed-in"

	return (
		<>
			<Title
				icon="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXdpZmktb2ZmIj48cGF0aCBkPSJNMTIgMjBoLjAxIi8+PHBhdGggZD0iTTguNSAxNi40MjlhNSA1IDAgMCAxIDcgMCIvPjxwYXRoIGQ9Ik01IDEyLjg1OWExMCAxMCAwIDAgMSA1LjE3LTIuNjkiLz48cGF0aCBkPSJNMTkgMTIuODU5YTEwIDEwIDAgMCAwLTIuMDA3LTEuNTIzIi8+PHBhdGggZD0iTTIgOC44MmExNSAxNSAwIDAgMSA0LjE3Ny0yLjY0MyIvPjxwYXRoIGQ9Ik0yMiA4LjgyYTE1IDE1IDAgMCAwLTExLjI4OC0zLjc2NCIvPjxwYXRoIGQ9Im0yIDIgMjAgMjAiLz48L3N2Zz4="
				title="Service Worker"
			/>
			<Divider full />
			{shouldUpdate && (
				<>
					<div>SW is out of date</div>
					<Button onClick={update}>Update SW</Button>
				</>
			)}
			{!shouldUpdate && (
				<>
					<div>SW is up to date</div>
					<Button disabled>Update SW</Button>
				</>
			)}
			<Divider full />
			<Title
				icon="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXdlYmhvb2siPjxwYXRoIGQ9Ik0xOCAxNi45OGgtNS45OWMtMS4xIDAtMS45NS45NC0yLjQ4IDEuOUE0IDQgMCAwIDEgMiAxN2MuMDEtLjcuMi0xLjQuNTctMiIvPjxwYXRoIGQ9Im02IDE3IDMuMTMtNS43OGMuNTMtLjk3LjEtMi4xOC0uNS0zLjFhNCA0IDAgMSAxIDYuODktNC4wNiIvPjxwYXRoIGQ9Im0xMiA2IDMuMTMgNS43M0MxNS42NiAxMi43IDE2LjkgMTMgMTggMTNhNCA0IDAgMCAxIDAgOCIvPjwvc3ZnPg=="
				title="Push Messaging"
			/>
			<Divider full />
			<Button
				disabled={!sw || !signedIn}
				onClick={() =>
					void Notification.requestPermission()
						.then(() => sw!.postMessage({ type: "SUBSCRIBE" }))
						.catch(console.error)
				}
			>
				{signedIn ? "Subscribe" : "Sign in to subscribe"}
			</Button>
		</>
	)
}
