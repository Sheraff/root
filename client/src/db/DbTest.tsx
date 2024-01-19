import { useDB, useQuery } from "@vlcn.io/react"
import { useEffect, useState } from "react"
import { sql } from "shared/sql"

import { useSync } from "~/db/Sync"
import { useDbQuery } from "~/db/useDbQuery"
import { useDbMutation } from "~/db/useDbMutation"

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
	const ctx = useDB(name)
	const sync = useSync(ctx.db, name)

	const { mutateAsync } = useDbMutation<[id: string, content: string]>({
		dbName: name,
		query: sql`INSERT INTO test (id, content, position) VALUES (?, ?, -1) RETURNING id, content;`,
	})

	const addData = async (content: string) => {
		await mutateAsync([crypto.randomUUID(), content])
		await sync?.roundTrip()
	}

	const { mutateAsync: mutateAsync2 } = useDbMutation<
		[id: string],
		{ id: string; content: string }
	>({
		dbName: name,
		query: sql`DELETE FROM test WHERE id = ? RETURNING id, content;`,
		returning: true,
	})

	const removeData = async (id: string) => {
		const [res] = await mutateAsync2([id])
		console.log("---- remove", res)
		await sync?.roundTrip()
	}

	const dropData = async () => {
		await ctx.db.exec(sql`DELETE FROM test;`)
		await sync?.roundTrip()
	}

	useEffect(() => {
		if (!sync) return
		const controller = new AbortController()
		addEventListener("online", sync.roundTrip, { signal: controller.signal })
		if (navigator.onLine) sync.roundTrip()
		return () => controller.abort()
	}, [sync])

	const result = useQuery<{ id: string; content: string }>(
		ctx,
		sql`SELECT id, content, position FROM test ORDER BY position, id ASC`,
	)

	const [toggle, setToggle] = useState(true)
	const [toggleBis, setToggleBis] = useState(false)
	const [toggle2, setToggle2] = useState(false)

	return (
		<>
			<h2>Database</h2>
			<button onClick={() => setToggle((toggle) => !toggle)}>Toggle {String(!toggle)}</button>
			{toggle && <Test name={name} />}
			<button onClick={() => setToggleBis((toggle) => !toggle)}>
				Toggle bis {String(!toggleBis)}
			</button>
			{toggleBis && <TestBis name={name} />}
			<button onClick={() => setToggle2((toggle) => !toggle)}>Toggle 2 {String(!toggle2)}</button>
			{toggle2 && <Test2 name={name} />}
			<ul>
				{result.data?.map((item) => (
					<li key={item.id}>
						{item.content} <button onClick={() => removeData(item.id)}>delete</button>
					</li>
				))}
			</ul>
			<hr />
			<hr />
			<form
				onSubmit={(event) => {
					event.preventDefault()
					const content = event.currentTarget.content.value
					addData(content)
					event.currentTarget.reset()
				}}
			>
				<input
					type="text"
					name="content"
					required
				/>
				<div>
					<button
						type="button"
						onClick={dropData}
					>
						Clear list
					</button>
					<button>Add to list</button>
				</div>
			</form>
			<hr />
			{sync && (
				<>
					<button onClick={() => sync.roundTrip()}>Sync</button>
				</>
			)}
		</>
	)
}
