import { useQuery, useQueryClient, hashKey, type QueryClient } from "@tanstack/react-query"
import { useDB, type CtxAsync } from "@vlcn.io/react"
import { useEffect, useRef } from "react"

const UNIQUE_KEY = "__vlcn__react_query__cache_manager__"

type DBAsync = CtxAsync["db"]
type StmtAsync = Awaited<ReturnType<DBAsync["prepare"]>>

type UpdateType =
	/** INSERT */
	| 18
	/** UPDATE */
	| 23
	/** DELETE */
	| 9

const ALL_UPDATES = [18, 23, 9] as const

/**
 * Not really useful, this is just to increase the cache hit rate.
 */
function sqlToKey(sql: string) {
	return sql.replace(/\s+/g, " ")
}

const queryStore = new Map<
	/** dbName, sql */
	string,
	{
		/** how many react-query cache entries match this key */
		count: number
		/** how many react-query cache entries match this key and are actively being used */
		activeCount: number
		/**
		 * Prepared statement.
		 * This is stored as a promise to avoid race condition when multiple queries (≠ queryKey, but same SQL)
		 * are mounted at the same time, and would thus try to prepare the same statement.
		 */
		statement: Promise<StmtAsync> | null
		/**
		 * Array<`dbName, table`>
		 * The result of querying for tables used by the SQL.
		 */
		tables: string[] | null
		/**
		 * used to avoid race conditions between when we query for "tables used" and when we obtain the data.
		 * if `listening` is false, we can ignore the result of the query, otherwise we should attach listeners
		 * to every table used by the query.
		 */
		listening: boolean
	}
>()

const tableStore = new Map<
	/** dbName, table */
	string,
	{
		queries: Map<
			/** dbName, sql */
			string,
			/** partial key [dbName, sql] */
			readonly unknown[]
		>
		unsubscribe: () => void
	}
>()

function start(dbName: string, ctx: CtxAsync, client: QueryClient) {
	const cacheManager = client.getQueryCache()
	cacheManager.subscribe((event) => {
		if (event.query.queryKey[0] !== UNIQUE_KEY) return
		const queryKey = [event.query.queryKey[1], event.query.queryKey[2]] as const
		const hash = hashKey(queryKey)

		// new unknown useQuery hook just mounted. `queryFn` hasn't been called yet.
		if (event.type === "added") {
			console.debug("::::::added")
			const q = queryStore.get(hash)
			if (!q) {
				console.log("start listening to", hash)
				queryStore.set(hash, {
					count: 1,
					activeCount: 0,
					statement: null,
					tables: null,
					listening: false,
				})
			} else {
				console.log("increment count", hash)
				q.count++
			}
			return
		}

		// useQuery hook just mounted, `queryFn` might have been called already if it's not the first hook with this `queryKey`
		if (event.type === "observerAdded") {
			console.debug("::::::obs.added")
			let q = queryStore.get(hash)!
			if (!q) {
				// this should only happen in dev env, with hot module reloading
				q = {
					count: 1,
					activeCount: 0,
					statement: null,
					tables: null,
					listening: false,
				}
				queryStore.set(hash, q)
				console.warn("Query not found when trying to add observer", hash)
			}
			console.log("increment active count", hash)
			q.activeCount++
			if (q.activeCount !== 1) return
			q.listening = true
			getUsedTables(ctx.db, queryKey[1]).then((tables) => {
				if (!q.listening) return
				q.tables = tables
				for (const table of tables) {
					const tableKey = hashKey([dbName, table])
					const tableEntry = tableStore.get(tableKey)
					if (tableEntry) {
						tableEntry.queries.set(hash, queryKey)
						continue
					}
					const queries = new Map([[hash, queryKey]])
					console.log("start listening to table", [table, dbName])
					const unsubscribe = ctx.rx.onRange([table], (updates) => {
						console.log("updating after table change", updates, ...queries.keys())
						for (const update of updates) {
							for (const [, queryKey] of queries) {
								const filterKey = [UNIQUE_KEY, ...queryKey, { [update]: true }] as const
								client.invalidateQueries({
									exact: false,
									queryKey: filterKey,
								})
							}
						}
					})
					tableStore.set(tableKey, {
						queries,
						unsubscribe: () => {
							console.log("stop listening to table", [table, dbName])
							unsubscribe()
						},
					})
				}
			})
			return
		}

		// useQuery hook just unmounted, there might be more hooks with the same `queryKey` still mounted. Data might or might not be stale.
		if (event.type === "observerRemoved") {
			console.debug("::::::obs.removed")
			const q = queryStore.get(hash)
			if (!q) {
				console.error("Query not found when trying to remove observer", hash)
				return
			}
			console.log("decrement active count", hash)
			q.activeCount--
			if (q.activeCount !== 0) return
			console.log("all are inactive", hash)
			const filterKey = [UNIQUE_KEY, ...queryKey] as const
			const remaining = cacheManager.find({
				queryKey: filterKey,
				stale: false,
				exact: false,
			})

			if (!remaining) return
			/**
			 * No queries using that SQL are active anymore, so to preserve memory we stop
			 * listening to table changes and we finalize the statement. This requires that
			 * we also mark all queries using that SQL as stale, so that they can be
			 * re-executed when they become active again.
			 *
			 * If `gcTime` is "high enough", next time those queries are mounted they will
			 * start with stale data while the queryFn is being executed.
			 */
			client.invalidateQueries({
				exact: false,
				queryKey: filterKey,
			})
			// no more queries using that SQL are considered fresh, we can finalize the statement
			console.log("finalizing statement (obs. removed)", hash)
			q.statement?.then((s) => s.finalize(null))
			q.statement = null
			if (!q.listening) return
			q.listening = false
			if (!q.tables) return
			for (const table of q.tables) {
				const tableKey = hashKey([dbName, table])
				const t = tableStore.get(tableKey)
				if (!t) {
					console.error("Table not found when trying to remove from cache", table)
					continue
				}
				t.queries.delete(hash)
				if (t.queries.size) continue
				t.unsubscribe()
				tableStore.delete(tableKey)
			}
			return
		}

		// query got removed from cache, no more hooks with that `queryKey` are mounted, data is stale.
		if (event.type === "removed") {
			console.debug("::::::removed")
			const q = queryStore.get(hash)
			if (!q) {
				console.error("Query not found when trying to remove", hash)
				return
			}
			q.count--
			if (q.count > 0) return
			console.log("finalizing statement (removed)", hash)
			q.statement?.then((s) => s.finalize(null))
			q.statement = null
			console.log("removing from store", hash)
			queryStore.delete(hash)
			if (!q.listening) return
			q.listening = false
			if (!q.tables) return
			for (const table of q.tables) {
				const tableKey = hashKey([dbName, table])
				const t = tableStore.get(tableKey)
				if (!t) {
					console.error("Table not found when trying to remove from cache", table)
					continue
				}
				t.queries.delete(hash)
				if (t.queries.size) continue
				t.unsubscribe()
				tableStore.delete(tableKey)
			}
			q.tables = null
			return
		}

		console.debug(":::::other", event.type)
	})
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
	const client = useQueryClient()
	const ctx = useDB(dbName)

	/**
	 * synchronously start listening to cache events, otherwise we might miss
	 * the "added" event of a query mounted in the same render cycle as this hook.
	 * This should be fine because it's a very light function.
	 */
	const started = useRef(false)
	if (!started.current) {
		started.current = true
		start(dbName, ctx, client)
	}

	// only in dev
	useEffect(() => {
		// TODO: can we find a way to avoid HMR causing queries not to be found in the store?
		return () => {}
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
	updateTypes = ALL_UPDATES,
}: {
	dbName: string
	query: string
	select?: (data: TQueryFnData[]) => TData
	bindings?: ReadonlyArray<string>
	updateTypes?: ReadonlyArray<UpdateType>
}) {
	const ctx = useDB(dbName)
	const queryKey = [
		UNIQUE_KEY,
		dbName,
		sqlToKey(query),
		Object.fromEntries(updateTypes.map((t) => [t, true])) as Record<UpdateType, boolean>,
		bindings,
	] as readonly [
		typeof UNIQUE_KEY,
		dbName: string,
		sql: string,
		updateTypes: Record<UpdateType, boolean>,
		bindings: ReadonlyArray<string>,
	]

	return useQuery({
		queryKey,
		queryFn: async () => {
			console.debug("::::::queryFn")
			const partialKey = [queryKey[1], queryKey[2]] as const
			const key = hashKey(partialKey)

			const q = queryStore.get(key)
			if (!q) {
				throw new Error("Query not in store when trying to execute queryFn")
			}
			const statementPromise = q.statement ?? ctx.db.prepare(query)
			if (!q.statement) console.log("preparing statement", key)
			q.statement = statementPromise
			const statement = await statementPromise

			statement.bind(bindings)
			const [releaser, transaction] = await ctx.db.imperativeTx()
			if (!q.statement) {
				releaser()
				throw new Error("Query statement was finalized before being executed")
			}
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

/** leaky cache, seems ok though */
const usedTableCache = new Map<string, string[]>()
async function getUsedTables(db: DBAsync, query: string): Promise<string[]> {
	const cacheKey = hashKey([db.filename, query])
	const cached = usedTableCache.get(cacheKey)
	if (cached) return cached
	const sanitized = query.replaceAll("'", "''")
	const rows = await db.execA(/*sql*/ `
		SELECT tbl_name
		FROM tables_used('${sanitized}') AS u
		JOIN sqlite_master ON sqlite_master.name = u.name
		WHERE u.schema = 'main';
	`)
	const result = Array.from(new Set(rows.map((r) => r[0])))
	usedTableCache.set(cacheKey, result)
	return result
}
