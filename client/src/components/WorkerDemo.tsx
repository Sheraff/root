import { useEffect, useState } from "react"
import type { Incoming, Outgoing } from "client/worker/sum.worker"
import Worker from "client/worker/sum.worker?worker"
import { Divider } from "client/components/Divider/Divider"
import { Title } from "client/components/Bento/Title"
import { Output } from "client/components/Output/Output"

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
			<Title
				icon="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNwdSI+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIvPjxyZWN0IHg9IjkiIHk9IjkiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiLz48cGF0aCBkPSJNMTUgMnYyIi8+PHBhdGggZD0iTTE1IDIwdjIiLz48cGF0aCBkPSJNMiAxNWgyIi8+PHBhdGggZD0iTTIgOWgyIi8+PHBhdGggZD0iTTIwIDE1aDIiLz48cGF0aCBkPSJNMjAgOWgyIi8+PHBhdGggZD0iTTkgMnYyIi8+PHBhdGggZD0iTTkgMjB2MiIvPjwvc3ZnPg=="
				title="Web Worker"
			/>
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
			<p>+</p>
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
			<Output>{result}</Output>
		</>
	)
}
