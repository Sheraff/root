import { Button } from "client/components/Button/Button"
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

	if (!shouldUpdate) return <div>SW is up to date</div>
	return (
		<>
			<div>SW is out of date</div>
			<Button onClick={update}>Update SW</Button>
		</>
	)
}
