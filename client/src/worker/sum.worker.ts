/// <reference lib="webworker" />

export type Incoming =
	| { type: "add"; data: { a: number; b: number } }
	| { type: "b"; data: { b: string } }
	| { type: "c"; data: { c: string } }

export type Outgoing =
	| { type: "res"; data: { result: number } }
	| { type: "b"; data: { result: string } }
	| { type: "c"; data: { result: string } }

onmessage = (e: MessageEvent<Incoming>) => handleMessage(e.data)
function post(data: Outgoing, transfer?: Transferable[]) {
	postMessage(data, { transfer })
}

function handleMessage(event: Incoming) {
	// ...
	if (event.type === "add") {
		console.log("[worker] Received:", event.data)
		post({ type: "res", data: { result: event.data.a + event.data.b } })
	}
}
