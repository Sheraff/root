import { useEffect } from "react"
import type { Incoming, Outgoing } from "client/worker/sum.worker"

export function useSumWorker() {
	useEffect(() => {
		const worker = new Worker(new URL("./sum.worker", import.meta.url), { type: "module" })

		function post(data: Incoming, transfer?: Transferable[]) {
			worker.postMessage(data, { transfer })
		}

		const onMessage = ({ data: event }: MessageEvent<Outgoing>) => {
			console.log("from worker", event.data)
		}
		worker.addEventListener("message", onMessage)

		post({ type: "add", data: { a: 3, b: 4 } })

		return () => {
			worker.removeEventListener("message", onMessage)
			worker.terminate()
		}
	}, [])
}
