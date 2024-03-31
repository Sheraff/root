import Database from "better-sqlite3"
import path from "node:path"
import type { FastifyInstance } from "fastify"
import { extensionPath } from "@vlcn.io/crsqlite"
import { cryb64, type Change, type Changes } from "@vlcn.io/ws-common"
import { sql } from "shared/sql"
import { makeDbLogger } from "server/utils/dbLogger"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { schema } from "assets/drizzle-test"

export type CrsqliteDatabase = Database.Database & {
	getChanges(sinceVersion: bigint, requestorSiteId: Uint8Array): Change[]
	getId(): Uint8Array
	applyChanges(msg: Changes): void
	close(): void
}

function wrapDatabase(db: Database.Database): CrsqliteDatabase {
	const getChangesStatement = db
		.prepare(
			sql`SELECT "table", "pk", "cid", "val", "col_version", "db_version", NULL, "cl", "seq" FROM crsql_changes 
				WHERE db_version > ? AND site_id IS NOT ?`
		)
		.raw(true)
		.safeIntegers()

	const getIdStatement = db.prepare(sql`SELECT crsql_site_id()`).pluck()

	const applyChangesStatement = db.prepare(
		sql`INSERT INTO crsql_changes
			("table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq")
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	)

	const close = db.close.bind(db)

	return Object.assign(db, {
		getChanges(sinceVersion: bigint, requestorSiteId: Uint8Array) {
			return getChangesStatement.all(sinceVersion, requestorSiteId) as Change[]
		},
		getId() {
			return getIdStatement.get() as Uint8Array
		},
		applyChanges(msg: Changes) {
			db.transaction((msg: Changes) => {
				for (const c of msg.changes) {
					applyChangesStatement.run(
						c[0],
						c[1],
						c[2],
						c[3],
						c[4],
						c[5],
						msg.sender,
						c[7],
						c[8]
					)
				}
			})(msg)
		},
		close() {
			db.prepare(sql`SELECT crsql_finalize()`).run()
			close()
		},
	})
}

/**
 * @throws {Database.SqliteError}
 */
export function makeCrsqliteDb(
	fastify: FastifyInstance,
	options: {
		name?: string
		version: bigint
		dbPath?: string
		// schema: string
	}
) {
	const name =
		options.name && options.dbPath
			? path.join(options.dbPath, `${options.name}.sqlite3`)
			: ":memory:"
	fastify.log.info(`Connecting to database @ ${name}`)
	const client = new Database(name, {
		verbose: makeDbLogger(fastify),
	})
	client.pragma("journal_mode = WAL")
	client.pragma("synchronous = NORMAL")
	client.loadExtension(extensionPath)
	const db = drizzle(client, { logger: true, schema })

	try {
		migrate(db, { migrationsFolder: "../../../assets/src/drizzle-test/migrations" })
	} catch (e) {
		client.prepare(sql`SELECT crsql_finalize()`).run()
		client.close()
		throw e
	}

	const wrapped = wrapDatabase(client)
	return { db, client: wrapped }
}
