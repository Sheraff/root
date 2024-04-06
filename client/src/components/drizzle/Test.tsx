import { eq, type Query } from "drizzle-orm"
import { useEffect } from "react"
import initWasm from "@vlcn.io/crsqlite-wasm"
import tblrx from "@vlcn.io/rx-tbl"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { migrate } from "drizzle-orm-crsqlite-wasm/migrator"
import { drizzle, type CRSQLiteDatabase, type CRSQLiteSession } from "drizzle-orm-crsqlite-wasm"
import { migrations, schema } from "assets/drizzle-test"

async function make() {
	const sqlite = await initWasm()
	const sql = await sqlite.open("foo")
	const db = drizzle(sql, { schema, logger: true })
	await migrate(db, { migrations }).catch(console.error)
	const rx = tblrx(sql)
	return { db, rx }
}

export function DrizzleTest() {
	const client = useQueryClient()
	useEffect(() => {
		const key = "test"
		make()
			.then((ctx) => {
				console.log("ctx", ctx)
				client.setQueryData([key], {
					// schema: cleanSchema,
					// schemaName,
					name: "test",
					ctx,
				})
			})
			.catch(console.error)
	}, [])
	return (
		<div>
			Drizzle
			<hr />
			<TestChild />
		</div>
	)
}

declare module "drizzle-orm/session" {
	export interface PreparedQuery {
		finalize(): Promise<void>
	}
}

function TestChild() {
	const { data } = useQuery({ queryKey: ["test"] })
	useEffect(() => {
		if (!data) return
		const db = data.ctx.db as CRSQLiteDatabase<typeof schema>
		void (async function () {
			const foo = db.select().from(schema.countries).where(eq(schema.countries.name, "USA"))
			console.log("foo", foo)
			console.log(foo.toSQL().sql)
			console.log(foo.toSQL().params)
			const yo = useDrizzQuery(
				db.select().from(schema.countries).where(eq(schema.countries.name, "USA"))
			)
			await new Promise((resolve) => setTimeout(resolve, 1000))
			const prep = foo.prepare()
			console.log("prep", prep)
			await new Promise((resolve) => setTimeout(resolve, 1000))
			const data = await prep.all()
			console.log("data", data)
			await new Promise((resolve) => setTimeout(resolve, 1000))
		})()
	}, [data])
	return <div>Test</div>
}

const UNIQUE_KEY = "drizzle"

function useDrizzQuery<T>(
	query: {
		toSQL(): Query
		prepare(): {
			all(): Promise<T>
			finalize?: () => Promise<void>
		}
		session?: CRSQLiteSession<any, any>
	},
	updateTypes = [18, 23, 9]
): T {
	const q = query.toSQL()

	console.log("qqqqqqqqqq", query)

	const queryKey = [
		UNIQUE_KEY,
		query.session!.client.db,
		q.sql,
		Object.fromEntries(updateTypes.map((t) => [t, true])), // as Record<UpdateType, boolean>,
		q.params,
	] //as DbQueryKey

	console.log("useDrizzQuery", queryKey)
	return {} as T
}

interface MinDrizzle<T = unknown> {
	toSql: () => { sql: string; params: any[] }
	prepare(): {
		all(): Promise<T>
		finalize(): Promise<void>
	}
}

type Res<T extends MinDrizzle> = T extends MinDrizzle<infer R> ? R : never
