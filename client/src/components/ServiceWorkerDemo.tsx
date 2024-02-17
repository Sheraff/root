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
		</>
	)
}
