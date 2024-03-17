import type { DB } from "@vlcn.io/crsqlite-wasm"
import { drizzle } from "./crsqlite"
import * as schema from "../../../../shared/src/drizzle-test/schema"
import type { Dialect, SQL } from "drizzle-orm"
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
import { useQueryClient } from "@tanstack/react-query"

async function make() {
	const sqlite = await initWasm()
	const sql = await sqlite.open("test")
	const db = drizzle(sql, { schema })
	await migrate(db, { migrationsFolder: "drizzle" })
	const rx = tblrx(sql)
	return { db, rx }
}

export function DrizzleTest() {
	const client = useQueryClient()
	useEffect(() => {
		const key = "test"
		make()
			.then((db) => {
				client.setQueryData<DbStore>(key, {
					// schema: cleanSchema,
					// schemaName,
					name: "test",
					db,
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
	return <div>Test</div>
}
