/// <reference lib="webworker" />

export type Incoming = { id: number } & (
	| { type: "add"; data: { a: number; b: number } }
	| { type: "sub"; data: { a: number; b: number } }
	| { type: "c"; data: { c: string } }
)
export type Outgoing = { id: number } & (
	| { type: "add"; data: { result: number } }
	| { type: "sub"; data: { result: number } }
	| { type: "c"; data: { result: string } }
)

self.onmessage = (e: MessageEvent<Incoming>) => handleMessage(e.data)

function post<I extends Incoming>(
	sourceEvent: I,
	data: Extract<Outgoing, { type: I["type"] }>["data"],
	transfer?: Transferable[]
) {
	self.postMessage({ id: sourceEvent.id, type: sourceEvent.type, data }, { transfer })
}

function handleMessage(event: Incoming) {
	console.info("[worker] Received:", event.data)
	if (event.type === "add") {
		const { a, b } = event.data
		post(event, { result: a + b })
	} else if (event.type === "sub") {
		const { a, b } = event.data
		post(event, { result: a - b })
	}
}
