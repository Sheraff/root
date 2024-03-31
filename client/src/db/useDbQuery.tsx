import {
	useQuery,
	useQueryClient,
	hashKey,
	type QueryClient,
	type QueryCache,
} from "@tanstack/react-query"
import { useDb, type Ctx } from "client/db/DbProvider"
import type { Query } from "drizzle-orm"
import type { CRSQLitePreparedQuery, CRSQLiteSession } from "drizzle-orm-crsqlite-wasm"
import type { SQLitePreparedQuery } from "drizzle-orm/sqlite-core"
import { useLayoutEffect } from "react"

export const UNIQUE_KEY = "__vlcn__cache_manager__"

type DB = Ctx["client"]

type UpdateType =
	/** INSERT */
	| 18
	/** UPDATE */
	| 23
	/** DELETE */
	| 9

const ALL_UPDATES = [18, 23, 9] as const

type Binding = string | number | null | undefined

export type DbQueryKey = readonly [
	typeof UNIQUE_KEY,
	dbName: string,
	sql: string,
	bindings: readonly Binding[],
	updateTypes: Record<UpdateType, boolean>,
]

type QueryEntry = {
	dbName: string
	/** how many react-query cache entries match this key */
	count: number
	/** how many react-query cache entries match this key and are actively being used */
	activeCount: number
	/**
	 * Prepared statement.
	 * This is stored as a promise to avoid race condition when multiple queries (≠ queryKey, but same SQL)
	 * are mounted at the same time, and would thus try to prepare the same statement.
	 */
	statement: CRSQLitePreparedQuery | null
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

const queryStore = new Map<
	/** dbName, sql */
	string,
	QueryEntry
>()

const tableStore = new Map<
	/** dbName, table */
	string,
	{
		dbName: string
		queries: Map<
			/** dbName, sql */
			string,
			/** partial key [dbName, sql] */
			readonly unknown[]
		>
		unsubscribe: () => void
	}
>()

function cleanupQuery({
	q,
	cacheManager,
	queryKey,
	hash,
	dbName,
}: {
	q: QueryEntry
	cacheManager: QueryCache
	queryKey: readonly [dbName: string, sql: string, bindings: Binding[]]
	hash: string
	dbName: string
}) {
	// make sure no other queryKey is using that same SQL query and is still considered fresh
	const filterKey = [UNIQUE_KEY, ...queryKey] as const
	const remaining = cacheManager.find({
		queryKey: filterKey,
		stale: false,
		exact: false,
	})
	if (remaining) {
		// the same SQL query is still considered fresh in some other queryKey, we should keep listening to table changes
		console.log("cleanup query, key still in use", hash)
		return
	}

	console.log("cleanup query, finalizing statement", hash)
	queryStore.delete(hash)
	q.statement?.finalize().catch(console.error)
	q.statement = null

	// stop listening to table changes
	if (!q.listening) {
		// this should not happen
		console.warn("query was not listening to table changes when trying to cleanup")
		return
	}
	q.listening = false

	if (!q.tables) {
		// this can happen it `getUsedTables` was still in progress when we started this cleanup
		return
	}

	for (const table of q.tables) {
		const tableKey = hashKey([dbName, table])
		const t = tableStore.get(tableKey)
		if (!t) {
			console.error("Table not found when trying to remove from cache", table)
			continue
		}
		// remove current query from the list to be notified when that table changes
		t.queries.delete(hash)
		if (t.queries.size === 0) {
			// no more queries are interested in that table, stop listening to it
			t.unsubscribe()
			tableStore.delete(tableKey)
		}
	}

	q.tables = null
}

export function start(dbName: string, ctx: Ctx, client: QueryClient) {
	console.log("~~~ start cache manager ~~~", dbName)

	const cacheManager = client.getQueryCache()
	const unsubscribe = cacheManager.subscribe((event) => {
		const k = event.query.queryKey as readonly unknown[]
		if (k[0] !== UNIQUE_KEY) return
		if (k[1] !== dbName) return
		const eventQueryKey = k as DbQueryKey
		const queryKey = [eventQueryKey[1], eventQueryKey[2], eventQueryKey[3]] as [
			dbName: string,
			sql: string,
			bindings: Binding[],
		]
		const hash = hashKey(queryKey)

		/**
		 * New queryKey discovered by react-query (nothing else has happened with it yet, no data, no queryFn, ...)
		 * - increment the count (if it matches an SQL query in the store)
		 */
		if (event.type === "added") {
			console.debug("::::::added")
			const q = queryStore.get(hash)
			if (q) {
				console.log("increment count", hash)
				q.count++
			}
			return
		}

		/**
		 * queryFn is about to be called
		 * - add it to the store (if we've never seen this SQL before)
		 * - prepare the statement (if it's not already prepared)
		 * - start listening to table changes (if we're not already listening)
		 */
		if (event.type === "updated" && event.action.type === "fetch") {
			console.log("::::::updated:fetch")
			let q = queryStore.get(hash)!
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- force exclude `undefined` above for `getUsedTables` promise chain below, because it's never going back to undefined
			if (!q) {
				console.log("start listening to", hash)
				q = {
					dbName,
					count: 1, // "updated:fetch" happens after "added", so we initialize count to 1
					activeCount: 1, // "updated:fetch" happens after "observerAdded", so we initialize activeCount to 1
					statement: null,
					tables: null,
					listening: false,
				}
				queryStore.set(hash, q)
			}
			if (q.activeCount !== 1) return
			if (q.listening) return
			q.listening = true
			getUsedTables(ctx.client, queryKey[1], (tables) => {
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
								const filterKey = [
									UNIQUE_KEY,
									...queryKey,
									{ [update]: true },
								] as const
								client
									.invalidateQueries({
										exact: false,
										queryKey: filterKey,
									})
									.catch(console.error)
							}
						}
					})
					tableStore.set(tableKey, {
						dbName,
						queries,
						unsubscribe: () => {
							console.log("stop listening to table", [table, dbName])
							unsubscribe()
						},
					})
				}
			}).catch(console.error)
			return
		}

		/**
		 * Known queryKey mounted by react-query, it might be in any state (though if it's the initial mount, queryFn has not been called yet)
		 * - increment the activeCount (if it matches an SQL query in the store)
		 */
		if (event.type === "observerAdded") {
			console.debug("::::::obs.added")
			const q = queryStore.get(hash)
			if (!q) return
			console.log("increment active count", hash)
			q.activeCount++
			return
		}

		/**
		 * Known queryKey unmounted by react-query, it might be in any state. At this point it should be a known SQL query.
		 * - decrement the activeCount
		 * - if some queries using that SQL are still **not stale**, keep listening to table changes
		 * - otherwise
		 *   - finalize the statement
		 *   - stop listening to table changes
		 *   - remove query from store
		 */
		if (event.type === "observerRemoved") {
			console.debug("::::::obs.removed")
			const q = queryStore.get(hash)
			if (!q) {
				// this error should only be logged while we evaluate the stability of this react-query adapter, remove it after a while
				console.error(
					"Query not found when trying to remove observer. This can happen just after a Hot Reload, but is an actual error otherwise.",
					hash
				)
				return
			}
			q.activeCount--
			console.log("decrement active count", q.activeCount, hash)
			if (q.activeCount !== 0) return

			cleanupQuery({ q, cacheManager, queryKey, hash, dbName })
			return
		}

		/**
		 * Known queryKey was explicitly invalidated by react-query (e.g. `queryClient.invalidateQueries(queryKey)`)
		 * - if it was the last hold-out for that SQL query (not removed during the "observerRemoved" event)
		 *   - finalize the statement
		 *   - stop listening to table changes
		 *   - remove query from store
		 */
		if (event.type === "updated" && event.action.type === "invalidate") {
			console.log("::::::updated:invalidate")
			const q = queryStore.get(hash)
			if (!q) return
			if (q.activeCount !== 0) return
			if (!q.listening) return
			cleanupQuery({ q, cacheManager, queryKey, hash, dbName })
			return
		}

		/**
		 * Known queryKey is being "forgotten" by react-query, the intent is to remove all traces of it
		 * (if no other queryKey is also using that same SQL query).
		 */
		if (event.type === "removed") {
			console.debug("::::::removed")
			const q = queryStore.get(hash)
			if (!q) return
			// q.count--
			// if (q.count > 0) return
			cleanupQuery({ q, cacheManager, queryKey, hash, dbName })
			return
		}
	})

	return () => {
		unsubscribe()
		tableStore.forEach((t) => {
			if (t.dbName === dbName) {
				t.unsubscribe()
				tableStore.delete(t.dbName)
			}
		})
		queryStore.forEach((q) => {
			if (q.dbName === dbName) {
				q.statement?.finalize().catch(console.error)
				queryStore.delete(q.dbName)
			}
		})
	}
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
export function useCacheManager(dbName?: string) {
	const client = useQueryClient()
	const ctx = useDb(dbName)

	useLayoutEffect(() => {
		if (!ctx || !dbName) return
		start(dbName, ctx, client)
	}, [dbName, ctx, client])
}

export function useDbQuery<
	TQueryFnData = unknown,
	// TError = DefaultError, // TODO
	TData = TQueryFnData[],
>(
	query:
		| {
				toSQL(): Query
				prepare(): SQLitePreparedQuery<{
					all: TQueryFnData[]
					type: "async"
					run: void
					get: any
					values: any
					execute: any
				}>
				session?: CRSQLiteSession<any, any>
		  }
		| undefined,
	{
		select,
		updateTypes = ALL_UPDATES,
		enabled = true,
	}: {
		select?: (data: TQueryFnData[]) => TData
		updateTypes?: readonly UpdateType[]
		enabled?: boolean
	} = {}
) {
	const sqlParams = query?.toSQL()

	const queryKey = [
		UNIQUE_KEY,
		//@ts-expect-error -- these are exposed by `drizzle-orm-crsqlite-wasm` but not at the type level
		query.session.client.db,
		sqlParams?.sql,
		sqlParams?.params,
		Object.fromEntries(updateTypes.map((t) => [t, true])) as Record<UpdateType, boolean>,
	] as DbQueryKey

	return useQuery({
		enabled: Boolean(enabled && query),
		queryKey,
		queryFn: async () => {
			console.debug("::::::queryFn")
			const partialKey = [queryKey[1], queryKey[2], queryKey[3]] as const
			const key = hashKey(partialKey)
			const q = queryStore.get(key)
			if (!q) {
				throw new Error("Query not in store when trying to execute queryFn")
			}
			if (!q.statement) {
				q.statement = query!.prepare() as unknown as CRSQLitePreparedQuery
			}
			return q.statement.all() as Promise<TQueryFnData[]>
		},
		select,
		refetchOnReconnect: false, // local db, never disconnected
		retry: false, // SQL won't work better the 2nd time, there is no network reliability to worry about
		retryOnMount: false,
		refetchOnMount: true, // will only refetch if query is stale
		refetchOnWindowFocus: true, // in case browser sent the tab to sleep
		networkMode: "always",
		staleTime: Infinity,
	})
}

/** leaky cache, seems ok though */
const usedTableCache = new Map<string, string[]>()
async function getUsedTables(db: DB, query: string, callback: (tables: string[]) => void) {
	const cacheKey = hashKey([db.filename, query])
	const cached = usedTableCache.get(cacheKey)
	if (cached) return callback(cached)
	const sanitized = query.replaceAll("'", "''")
	const rows = (await db.tablesUsedStmt.all(null, sanitized)) as Array<[string]>
	const result = Array.from(new Set(rows.map((r) => r[0])))
	usedTableCache.set(cacheKey, result)
	return callback(result)
}
