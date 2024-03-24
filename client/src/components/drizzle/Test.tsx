import type { DB } from "@vlcn.io/crsqlite-wasm"
import { drizzle, type CRSQLite3Database } from "./crsqlite"
import * as schema from "shared/drizzle-test/schema"
import { eq, fillPlaceholders, type Dialect, type SQL } from "drizzle-orm"
import { useEffect } from "react"
import initWasm from "@vlcn.io/crsqlite-wasm"
import tblrx from "@vlcn.io/rx-tbl"

// export function makeDrizzleDb(db: DB) {
// 	return drizzle(db, { schema })
// }

// const db = makeDrizzleDb({} as DB)

// const res = db.query.countries
// 	.findMany({
// 		with: {
// 			cities: {
// 				where: (city, { eq, sql }) => eq(city.name, sql.placeholder("cityName")),
// 			},
// 		},
// 	})
// 	.prepare()

// type foo = keyof typeof res & {} & string
// //   ^?

// res.finalize()

// const data = await res.all({ cityName: "New York" })
// //    ^?

// console.log(data)

import { migrate } from "./crsqlite/migrator"
import { useQuery, useQueryClient } from "@tanstack/react-query"

async function make() {
	const sqlite = await initWasm()
	const sql = await sqlite.open("test")
	const db = drizzle(sql, { schema, logger: true })
	await migrate(db, { migrationsFolder: "drizzle" }).catch(console.error)
	const rx = tblrx(sql)
	return { db, rx, sql }
}

export function DrizzleTest() {
	const client = useQueryClient()
	useEffect(() => {
		const key = "test"
		make()
			.then((ctx) => {
				console.log("ctx", ctx)
				client.setQueryData<DbStore>([key], {
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

function TestChild() {
	const { data } = useQuery({ queryKey: ["test"] })
	useEffect(() => {
		if (!data) return
		const db = data.ctx.db as CRSQLite3Database<typeof schema>
		void (async function () {
			let [usa] = await db
				.select()
				.from(schema.countries)
				.where(eq(schema.countries.name, "USA"))
			if (!usa) {
				;[usa] = await db
					.insert(schema.countries)
					.values({
						id: crypto.randomUUID(),
						name: "USA",
						population: 331_900_000,
					})
					.returning()
			}
			let [nyc] = await db
				.select()
				.from(schema.cities)
				.where(eq(schema.cities.name, "New York"))
			console.log("::::::::::: nyc", nyc)
			if (!nyc) {
				;[nyc] = await db
					.insert(schema.cities)
					.values({
						id: crypto.randomUUID(),
						name: "New York",
						population: 8_336_817,
						countryId: usa!.id,
					})
					.returning()
			}
			const res = db.query.countries.findMany({
				with: {
					cities: {
						where: (city, { eq, sql }) => eq(city.name, sql.placeholder("cityName")),
					},
				},
			})

			console.log(":::::::::::::: prepared user-query", res.toSQL())
			;(data.ctx.sql as DB)
				.exec(
					res.toSQL().sql,
					fillPlaceholders(res.toSQL().params, { cityName: "New York" })
				)
				.then(console.log)
				.catch(console.error)
			res.prepare().all({ cityName: "New York" }).then(console.log).catch(console.error)
		})()
	}, [data])
	return <div>Test</div>
}
