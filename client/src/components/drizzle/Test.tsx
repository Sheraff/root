import type { DB } from "@vlcn.io/crsqlite-wasm"
import { drizzle } from "./crsqlite"
import * as schema from "./schema"

export function makeDrizzleDb(db: DB) {
	return drizzle(db, { schema })
}

const db = makeDrizzleDb({} as DB)

const res = db.query.countries
	.findMany({
		with: {
			cities: {
				where: (city, { eq, sql }) => eq(city.name, sql.placeholder("cityName")),
			},
		},
	})
	.prepare()

const data = await res.all({ cityName: "New York" })
//    ^?

console.log(data)
