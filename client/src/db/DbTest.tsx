import { DBProvider as BaseDbProvider, useDB as useVlcnDb, useQuery } from "@vlcn.io/react"
import schema from "shared/schemas/test-v0.sql"
import { createContext, useContext, useEffect } from "react"
import { sql } from "shared/sql"
import { useSync } from "~/db/Sync"
import { useCacheManager, useDbQuery } from "~/db/useDbQuery"

const NameContext = createContext<string | null>(null)
function useName() {
	const name = useContext(NameContext)
	if (!name) throw new Error("NameContext.Provider not found")
	return name
}

function useDB() {
	const name = useName()
	return useVlcnDb(name)
}

function Content() {
	const ctx = useDB()
	const sync = useSync(ctx.db, useName())
	useCacheManager(useName())

	const addData = async (content: string) => {
		await ctx.db.exec(sql`INSERT INTO test (id, content, position) VALUES (?, ?, -1);`, [
			crypto.randomUUID(),
			content,
		])
		sync?.pushChanges()
	}

	const dropData = async () => {
		await ctx.db.exec(sql`DELETE FROM test;`)
		sync?.pushChanges()
	}

	useEffect(() => {
		if (!sync) return
		const controller = new AbortController()
		let online = navigator.onLine
		const roundTrip = () => {
			online = true
			sync.pushChanges().then(() => {
				if (online && !controller.signal.aborted) {
					sync.pullChanges()
				}
			})
		}
		addEventListener("offline", () => (online = false), { signal: controller.signal })
		addEventListener("online", roundTrip, { signal: controller.signal })
		if (navigator.onLine) roundTrip()
		return () => controller.abort()
	}, [sync])

	const result = useQuery<{ id: string; content: string }>(
		ctx,
		sql`SELECT id, content, position FROM test ORDER BY position, id ASC`,
	)

	const other = useDbQuery<{ id: string; content: string; position: number }>({
		dbName: useName(),
		query: sql`SELECT id, content, position FROM test ORDER BY position, id ASC`,
	})

	if (result.loading || other.isLoading) return <div>loading...</div>

	return (
		<>
			<h2>Database</h2>
			<ul>
				{result.data.map((item) => (
					<li key={item.id}>{item.content}</li>
				))}
			</ul>
			<hr />
			<ul>{other.data?.map((item) => <li key={item.id}>{item.content}</li>)}</ul>
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
					<button onClick={() => sync.pullChanges()}>Pull</button>
					<button onClick={() => sync.pushChanges()}>Push</button>
				</>
			)}
		</>
	)
}

export function DbProvider({ name }: { name: string }) {
	return (
		<NameContext.Provider value={name}>
			<BaseDbProvider
				dbname={name}
				schema={{
					name: "test-v0",
					content: schema.replace(/[\s\n\t]+/g, " ").trim(),
				}}
				fallback={<div>Creating DB {name}</div>}
				Render={Content}
			/>
		</NameContext.Provider>
	)
}
