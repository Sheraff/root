import { afterAll, describe, expect, it } from "vitest"
import "@vitest/web-worker"
import Worker from "client/worker/sum.worker?worker"
import { type Incoming, type Outgoing } from "client/worker/sum.worker"

describe.concurrent("sum.worker", () => {
	const worker = new Worker()
	afterAll(() => worker.terminate())
	let id = 0

	function post<I extends Incoming["type"]>(
		type: I,
		data: Extract<Incoming, { type: I }>["data"]
	) {
		const d = { type, data, id: id++ }
		type Response = MessageEvent<Extract<Outgoing, { type: I }>>
		worker.postMessage(d)
		let resolve: (value: Response) => void
		const onMessage = (e: MessageEvent<Outgoing>) => {
			if (e.data.id === d.id) {
				worker.removeEventListener("message", onMessage)
				resolve(e as Response)
			}
		}
		worker.addEventListener("message", onMessage)
		return new Promise<Response>((r) => (resolve = r))
	}

	it("1 + 2 = 3", async () => {
		const res = await post("add", { a: 1, b: 2 })
		expect(res.data.data).toEqual({ result: 3 })
	})
	it("-1 + 2 = 1", async () => {
		const res = await post("add", { a: -1, b: 2 })
		expect(res.data.data).toEqual({ result: 1 })
	})
	it("1 - 2 = -1", async () => {
		const res = await post("sub", { a: 1, b: 2 })
		expect(res.data.data).toEqual({ result: -1 })
	})
})
