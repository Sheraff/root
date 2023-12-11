import { useQuery, useQueryClient, hashKey } from "@tanstack/react-query"
import { useDB, type CtxAsync } from "@vlcn.io/react"
import { useEffect, useState, useRef } from "react"

type DBAsync = CtxAsync["db"]

type UpdateType =
	/** INSERT */
	| 18
	/** UPDATE */
	| 23
	/** DELETE */
	| 9

/**
 * Not really useful, this is just to increase the cache hit rate.
 */
function sqlToKey(sql: string) {
	return sql.replace(/\s+/g, " ")
}

/**
 * Rely on react-query's cacheManager to
 * - know which queries are active
 * - force invalidation of "currently in-use" queries
 *
 * Rely on vlcn RX to
 * - know which tables are used by a query
 * - know when to invalidate queries
 */
export function useCacheManager(dbName: string) {
	const [tables, setTables] = useState<string[]>([])
	const queryMap = useRef(
		new Map<
			string,
			{
				tables: string[]
				updateTypes: UpdateType[]
				queryKey: unknown[]
			}
		>(),
	)

	const client = useQueryClient()
	const ctx = useDB(dbName)

	useEffect(() => {
		/** not the cleanest implementation, could execute less code if it was outside of react */
		const cleanup = tables.map((table) =>
			ctx.rx.onRange([table], (updates) => {
				queryMap.current.forEach((query) => {
					if (!query.tables.includes(table)) return
					if (!updates.some((u) => query.updateTypes.includes(u))) return
					client.invalidateQueries({ queryKey: query.queryKey, exact: true })
				})
			}),
		)
		return () => {
			for (const dispose of cleanup) {
				dispose()
			}
		}
	}, [tables])

	useEffect(() => {
		const cacheManager = client.getQueryCache()
		/** count how many queries are relying on each table */
		const tableCountMap = new Map<string, number>()

		const cacheUnsubscribe = cacheManager.subscribe((event) => {
			if (event.type === "observerAdded") {
				const key = hashKey(event.query.queryKey)
				if (queryMap.current.has(key)) return
				/** add to Map early, so we know if it has been deleted by `observerRemoved` before `usedTables` resolves */
				queryMap.current.set(key, {
					updateTypes: event.query.queryKey[2],
					queryKey: event.query.queryKey,
					tables: [],
				})
				usedTables(ctx.db, event.query.queryKey[1]).then((usedTables) => {
					const query = queryMap.current.get(key)
					if (!query) return
					queryMap.current.set(key, { ...query, tables: usedTables })
					for (const table of usedTables) {
						if (!tableCountMap.has(table)) {
							tableCountMap.set(table, 1)
							setTables((tables) => [...tables, table])
						} else {
							tableCountMap.set(table, tableCountMap.get(table)! + 1)
						}
					}
				})
			} else if (event.type === "observerRemoved") {
				const key = hashKey(event.query.queryKey)
				const query = queryMap.current.get(key)
				if (!query) return
				queryMap.current.delete(key)
				for (const table of query.tables) {
					if (!tableCountMap.has(table)) continue
					const count = tableCountMap.get(table)!
					if (count === 1) {
						tableCountMap.delete(table)
						setTables((tables) => tables.filter((t) => t !== table))
					} else {
						tableCountMap.set(table, count - 1)
					}
				}
			}
		})
		return cacheUnsubscribe
	}, [])
}

let queryId = 0

export function useDbQuery<
	TQueryFnData = unknown,
	// TError = DefaultError, // TODO
	TData = TQueryFnData[],
>({
	dbName,
	query,
	select,
	bindings = [],
	updateTypes = [18, 23, 9],
}: {
	dbName: string
	query: string
	select?: (data: TQueryFnData[]) => TData
	bindings?: ReadonlyArray<string>
	updateTypes?: Array<UpdateType>
}) {
	const ctx = useDB(dbName)
	const queryKey = [dbName, sqlToKey(query), updateTypes, bindings]

	return useQuery({
		queryKey,
		queryFn: async () => {
			const statement = await ctx.db.prepare(query)
			statement.bind(bindings)
			const [releaser, transaction] = await ctx.db.imperativeTx()
			const transactionId = queryId++
			transaction.exec(/*sql*/ `SAVEPOINT use_query_${transactionId};`)
			statement.raw(false)
			try {
				const data = (await statement.all(transaction)) as TQueryFnData[]
				transaction.exec(/*sql*/ `RELEASE use_query_${transactionId};`).then(releaser, releaser)
				return data
			} catch (e) {
				transaction.exec(/*sql*/ `ROLLBACK TO use_query_${transactionId};`).then(releaser, releaser)
				throw e
			}
		},
		select,
	})
}

async function usedTables(db: DBAsync, query: string): Promise<string[]> {
	const sanitized = query.replaceAll("'", "''")
	const rows = await db.execA(/*sql*/ `
		SELECT tbl_name
		FROM tables_used('${sanitized}') AS u
		JOIN sqlite_master ON sqlite_master.name = u.name
		WHERE u.schema = 'main';
	`)
	return rows.map((r) => r[0])
}
