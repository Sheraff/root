import { useAuthContext } from "client/auth/useAuthContext"
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
			<h2>Service Worker</h2>
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
			<Divider />
			<div>Server push messaging</div>
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
