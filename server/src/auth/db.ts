import Database from "better-sqlite3"
import schemaContent from "./model.sql"
import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import type { FastifyInstance } from "fastify"

const dir = path.join(process.cwd(), "db")

if (!existsSync(dir)) {
	mkdirSync(dir)
}

export function makeAuthDb(fastify: FastifyInstance) {
	const authDB = new Database(path.join(dir, "auth.sqlite3"), {
		verbose: (main, ...rest) => {
			if (rest.length) {
				fastify.log.info(main, "", ...rest)
			} else {
				fastify.log.info(main)
			}
		},
	})
	authDB.pragma("journal_mode = WAL")
	authDB.exec(schemaContent)

	fastify.addHook("onClose", () => {
		fastify.log.info("Closing auth database...")
		authDB.close()
	})

	return authDB
}
