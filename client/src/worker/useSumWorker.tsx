import { useEffect } from "react"
import type { Incoming, Outgoing } from "client/worker/sum.worker"
import Worker from "client/worker/sum.worker?worker"

export function useSumWorker() {
	useEffect(() => {
		const worker = new Worker()
		let id = 0

		function post<I extends Incoming["type"]>(
			type: I,
			data: Extract<Incoming, { type: I }>["data"],
			transfer?: Transferable[]
		) {
			worker.postMessage({ type, data, id: id++ }, { transfer })
		}

		const onMessage = ({ data: event }: MessageEvent<Outgoing>) => {
			console.log("from worker", event.data)
		}
		worker.addEventListener("message", onMessage)

		post("add", { a: 1, b: 2 })

		return () => {
			worker.removeEventListener("message", onMessage)
			worker.terminate()
		}
	}, [])
}
