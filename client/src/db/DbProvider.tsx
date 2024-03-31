import { useEffect } from "react"
import { useCacheManager } from "client/db/useDbQuery"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import initWasm, { type DB } from "@vlcn.io/crsqlite-wasm"
import tblrx, { type TblRx } from "@vlcn.io/rx-tbl"
import { drizzle, type CRSQLiteDatabase } from "drizzle-orm-crsqlite-wasm"
import { migrate } from "drizzle-orm-crsqlite-wasm/migrator"
import type { MigrationMeta } from "drizzle-orm/migrator"

const DB_KEY = "__sqlite__db_context__"

export type Ctx<TSchema extends Record<string, unknown> = Record<string, unknown>> = {
	readonly client: DB
	readonly rx: TblRx
	readonly db: CRSQLiteDatabase<TSchema>
}

type DbStore<TSchema extends Record<string, unknown> = Record<string, unknown>> = {
	schema: TSchema
	db: Ctx<TSchema>
	name: string
}

declare global {
	interface LockManager {
		request<T>(
			name: string,
			options: { mode: "exclusive" },
			fn: () => T | Promise<T>
		): Promise<T>
	}
}

async function makeDb(
	name: string,
	schema: Record<string, unknown>,
	migrations: MigrationMeta[]
): Promise<Ctx> {
	return navigator.locks.request("db-init", { mode: "exclusive" }, async () => {
		const sqlite = await initWasm()
		const client = await sqlite.open(name)
		const db = drizzle(client, { schema, logger: true })
		await migrate(db, { migrations }).catch(console.error)
		const rx = tblrx(client)
		return { client, rx, db }
	})
}

async function destroyDb({ client, rx }: Ctx): Promise<void> {
	return navigator.locks.request("db-init", { mode: "exclusive" }, async () => {
		rx.dispose()
		await client.close()
	})
}

/**
 * Call this hook to create a new database and store it in the cache. This hook
 * should be called once per database name.
 * @param name Local unique name for the database, used to identify the database in the cache
 * @param schema SQL schema to create the database
 * @param schemaName Global unique name for the schema, used to identify the schema on the server
 */
export function useDbProvider(
	name: string | undefined,
	schema: Record<string, unknown>,
	migrations: MigrationMeta[]
) {
	const client = useQueryClient()

	useEffect(() => {
		if (!name) return
		let closed = false
		const keyByName = [DB_KEY, name]
		const existing = client.getQueryData<DbStore>(keyByName)
		if (existing) {
			const e = new Error(
				`\`useDbProvider\` called multiple times with the same DB name "${name}"`
			)
			console.error(e)
			throw e
		}
		makeDb(name, schema, migrations)
			.then((db) => {
				if (closed) return
				const keyById = [DB_KEY, db.client.db]
				const stored = { schema, name, db }
				client.setQueryData<DbStore>(keyByName, stored)
				client.setQueryData<DbStore>(keyById, stored) // do we need the "by id" entry in the end?
			})
			.catch((e) => {
				console.error("Error creating db", e)
				throw e
			})
		return () => {
			closed = true
			const existing = client.getQueryData<DbStore>(keyByName)
			if (existing) {
				const keyById = [DB_KEY, existing.db.client.db]
				client.removeQueries({ queryKey: keyByName, exact: true })
				void destroyDb(existing.db)
				client.removeQueries({ queryKey: keyById, exact: true }) // do we need the "by id" entry in the end?
			}
		}
	}, [name, schema])

	useCacheManager(name)
}

/**
 * Call this hook to retrieve a database from the cache
 * @param name Local unique name for the database, used to identify the database in the cache
 */
export function useDb<TSchema extends Record<string, unknown> = Record<string, unknown>>(
	name?: string
): Ctx<TSchema> | undefined {
	const { data } = useQuery<DbStore<TSchema>, unknown, Ctx<TSchema>>({
		enabled: Boolean(name),
		queryKey: [DB_KEY, name],
		gcTime: Infinity,
		staleTime: Infinity,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		networkMode: "always",
		refetchOnReconnect: false,
		retry: false,
		select: (data) => data.db,
	})
	return data
}
