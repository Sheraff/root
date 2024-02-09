import { useEffect, useState } from "react"
import { sql } from "shared/sql"

import { useSync } from "client/db/Sync"
import { useDbQuery } from "client/db/useDbQuery"
import { useDbMutation } from "client/db/useDbMutation"
import { Button } from "client/components/Button/Button"
import { useDb } from "client/db/DbProvider"
import { Divider } from "client/components/Divider/Divider"

function Test({ name }: { name: string }) {
	const other = useDbQuery<{ id: string; content: string; position: number }>({
		dbName: name,
		query: sql`SELECT id, content, position FROM test ORDER BY position, id ASC`,
	})

	return (
		<div style={{ padding: 10, background: "black" }}>
			<ul>{other.data?.map((item) => <li key={item.id}>{item.content}</li>)}</ul>
		</div>
	)
}

function TestBis({ name }: { name: string }) {
	const other = useDbQuery<{ id: string; content: string; position: number }>({
		dbName: name,
		query: sql`SELECT id, content, position FROM test ORDER BY position, id ASC`,
	})

	return (
		<div style={{ padding: 10, background: "black" }}>
			<ul>{other.data?.map((item) => <li key={item.id}>{item.content}</li>)}</ul>
		</div>
	)
}

function Test2({ name }: { name: string }) {
	const other = useDbQuery<{ id: string; content: string; position: number }>({
		dbName: name,
		query: sql`SELECT id, content, position FROM test ORDER BY position, id ASC`,
		updateTypes: [18],
	})

	return (
		<div style={{ padding: 10, background: "black" }}>
			<ul>{other.data?.map((item) => <li key={item.id}>{item.content}</li>)}</ul>
		</div>
	)
}

export function Content({ name }: { name: string }) {
	const ctx = useDb(name)
	const sync = useSync(ctx?.db, name)

	const { mutateAsync } = useDbMutation<[id: string, content: string]>({
		dbName: name,
		query: sql`INSERT INTO test (id, content, position) VALUES (?, ?, -1) RETURNING id, content;`,
	})

	const addData = async (content: string) => {
		await mutateAsync([crypto.randomUUID(), content])
		await sync?.roundTrip()
	}

	// const { mutateAsync: mutateAsync2 } = useDbMutation<
	// 	[id: string],
	// 	{ id: string; content: string }
	// >({
	// 	dbName: name,
	// 	query: sql`DELETE FROM test WHERE id = ? RETURNING id, content;`,
	// 	returning: true,
	// })

	// const removeData = async (id: string) => {
	// 	const [res] = await mutateAsync2([id])
	// 	console.log("---- remove", res)
	// 	await sync?.roundTrip()
	// }

	const dropData = async () => {
		if (!ctx) return
		await ctx.db.exec(sql`DELETE FROM test;`)
		await sync?.roundTrip()
	}

	useEffect(() => {
		if (!sync) return
		const controller = new AbortController()
		addEventListener("online", () => void sync.roundTrip(), { signal: controller.signal })
		if (navigator.onLine) {
			void sync.roundTrip()
		}
		return () => controller.abort()
	}, [sync])

	const [toggle, setToggle] = useState(true)
	const [toggleBis, setToggleBis] = useState(false)
	const [toggle2, setToggle2] = useState(false)

	return (
		<>
			<h2>Database</h2>
			<Button onClick={() => setToggle((toggle) => !toggle)}>Toggle {String(!toggle)}</Button>
			{toggle && <Test name={name} />}
			<Button onClick={() => setToggleBis((toggle) => !toggle)}>
				Toggle bis {String(!toggleBis)}
			</Button>
			{toggleBis && <TestBis name={name} />}
			<Button onClick={() => setToggle2((toggle) => !toggle)}>
				Toggle 2 {String(!toggle2)}
			</Button>
			{toggle2 && <Test2 name={name} />}
			<Divider />
			<form
				onSubmit={(event) => {
					event.preventDefault()
					const content = (event.currentTarget.content as HTMLInputElement).value
					void addData(content)
					event.currentTarget.reset()
				}}
			>
				<input type="text" name="content" required />
				<div>
					<Button type="button" onClick={() => void dropData()}>
						Clear list
					</Button>
					<Button>Add to list</Button>
				</div>
			</form>
			<Divider />
			{sync && (
				<>
					<Button onClick={() => void sync.roundTrip()}>Sync</Button>
				</>
			)}
		</>
	)
}
