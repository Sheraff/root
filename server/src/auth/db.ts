import Database from "better-sqlite3"
import schemaContent from "./schema.sql"
import path from "node:path"
import type { FastifyInstance } from "fastify"
import { makeDbLogger } from "server/utils/dbLogger"

export function makeAuthDb(fastify: FastifyInstance, options: { dbPath?: string } = {}): Database.Database {
	const name = options.dbPath ? path.join(options.dbPath, "auth.sqlite3") : ":memory:"
	fastify.log.info(`Creating auth database @ ${name}`)
	const db = new Database(name, {
		verbose: makeDbLogger(fastify),
	})
	db.pragma("journal_mode = WAL")
	db.pragma("synchronous = NORMAL")
	db.exec(schemaContent)

	return db
}
