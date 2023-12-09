import Database from "better-sqlite3"
import schemaContent from "./model.sql"
import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import type { FastifyInstance } from "fastify"

const projectRoot = process.env.ROOT

if (!projectRoot) {
	throw new Error("ROOT environment variable not set.")
}

const dir = path.join(projectRoot, "db")

if (!existsSync(dir)) {
	mkdirSync(dir)
}

export function makeAuthDb(fastify: FastifyInstance) {
	const name = path.join(dir, "auth.sqlite3")
	fastify.log.info(`Creating auth database @ ${name}`)
	const authDB = new Database(name, {
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
		console.log("Closing auth database...")
		authDB.close()
		console.log("Auth database closed.")
	})

	return authDB
}
