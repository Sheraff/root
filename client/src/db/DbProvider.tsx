import { dbFactory, type CtxAsync } from "@vlcn.io/react"
import { useEffect } from "react"
import { useCacheManager } from "client/db/useDbQuery"
import { useQuery, useQueryClient } from "@tanstack/react-query"

const DB_KEY = "__sqlite__db_context__"

type DbStore = {
	schema: string
	schemaName: string
	db: CtxAsync
	name: string
}

/**
 * Call this hook to create a new database and store it in the cache. This hook
 * should be called once per database name.
 * @param name Local unique name for the database, used to identify the database in the cache
 * @param schema SQL schema to create the database
 * @param schemaName Global unique name for the schema, used to identify the schema on the server
 */
export function useDbProvider(name: string | undefined, schema: string, schemaName: string) {
	const client = useQueryClient()

	useEffect(() => {
		if (!name) return
		let closed = false
		const cleanSchema = schema.replace(/[\s\n\t]+/g, " ").trim()
		const params = {
			content: cleanSchema,
			name: schemaName,
		}
		const key = [DB_KEY, name]
		const existing = client.getQueryData<DbStore>(key)
		if (existing) {
			const e = new Error(
				`\`useDbProvider\` called multiple times with the same DB name "${name}"`
			)
			console.error(e)
			throw e
		}
		dbFactory
			.get(name, params)
			.then((db) => {
				if (closed) return
				client.setQueryData<DbStore>(key, {
					schema: cleanSchema,
					schemaName,
					name,
					db,
				})
			})
			.catch((e) => {
				console.error("Error creating db", e)
				throw e
			})
		return () => {
			closed = true
			void dbFactory.closeAndRemove(name)
			client.removeQueries({ queryKey: key, exact: true })
		}
	}, [name, schema, schemaName])

	useCacheManager(name)
}

/**
 * Call this hook to retrieve a database from the cache
 * @param name Local unique name for the database, used to identify the database in the cache
 */
export function useDb(name?: string): CtxAsync | undefined {
	const { data } = useQuery<DbStore, unknown, CtxAsync>({
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
