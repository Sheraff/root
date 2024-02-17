import { useEffect, useState } from "react"
import type { Incoming, Outgoing } from "client/worker/sum.worker"
import Worker from "client/worker/sum.worker?worker"
import { Divider } from "client/components/Divider/Divider"

export function WorkerDemo() {
	const [a, setA] = useState(0)
	const [b, setB] = useState(0)
	const [result, setResult] = useState(0)
	const [post, setPost] = useState<((a: number, b: number) => void) | null>(null)

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
			setResult(Number(event.data.result))
		}
		worker.addEventListener("message", onMessage)

		setPost(() => (a: number, b: number) => post("add", { a, b }))

		return () => {
			worker.removeEventListener("message", onMessage)
			worker.terminate()
		}
	}, [])

	return (
		<>
			<h2>Web Worker</h2>
			<Divider full />
			<input
				type="number"
				value={a}
				onChange={(e) => {
					const a = Number(e.target.value)
					setA(a)
					post?.(a, b)
				}}
				pattern="[0-9]*"
				step="1"
			/>
			<div>+</div>
			<input
				type="number"
				value={b}
				onChange={(e) => {
					const b = Number(e.target.value)
					setB(b)
					post?.(a, b)
				}}
				pattern="[0-9]*"
				step="1"
			/>
			<Divider />
			<output>{result}</output>
		</>
	)
}
