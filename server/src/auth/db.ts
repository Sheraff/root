import Database from "better-sqlite3"
import schemaContent from "./schema.sql"
import path from "node:path"
import type { FastifyInstance } from "fastify"
import { DB_ROOT } from "~/utils/dbRoot"
import { makeDbLogger } from "~/utils/dbLogger"

export function makeAuthDb(fastify: FastifyInstance) {
	const name = path.join(DB_ROOT, "auth.sqlite3")
	fastify.log.info(`Creating auth database @ ${name}`)
	const db = new Database(name, {
		verbose: makeDbLogger(fastify),
	})
	db.pragma("journal_mode = WAL")
	db.pragma("synchronous = NORMAL")
	db.exec(schemaContent)

	fastify.addHook("onClose", () => {
		console.log("Closing auth database...")
		db.close()
		console.log("Auth database closed.")
	})

	return db
}
