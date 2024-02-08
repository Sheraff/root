import Database from "better-sqlite3"
import path from "node:path"
import type { FastifyInstance } from "fastify"
import { extensionPath } from "@vlcn.io/crsqlite"
import { cryb64, type Change, type Changes } from "@vlcn.io/ws-common"
import { sql } from "shared/sql"
import { makeDbLogger } from "server/utils/dbLogger"

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
		schema: string
	}
) {
	const name =
		options.name && options.dbPath
			? path.join(options.dbPath, `${options.name}.sqlite3`)
			: ":memory:"
	fastify.log.info(`Connecting to database @ ${name}`)
	const db = new Database(name, {
		verbose: makeDbLogger(fastify),
	})
	db.pragma("journal_mode = WAL")
	db.pragma("synchronous = NORMAL")
	db.loadExtension(extensionPath)

	try {
		// auto-migrate
		const masterStatement = db
			.prepare(sql`SELECT value FROM crsql_master WHERE key = ?`)
			.pluck()

		const schemaVersion = masterStatement.safeIntegers().get("schema_version") as
			| bigint
			| undefined
		if (options.version === schemaVersion) {
			return wrapDatabase(db)
		}
		if (schemaVersion) {
			fastify.log.warn(
				`Mismatch schema version for database "${name}". Client requested v${options.version} but server is on v${schemaVersion}. Will try to auto-migrate...`
			)
		} else {
			fastify.log.info(`First client request for database "${name}". Initializing...`)
		}

		const content = options.schema.replace(/[\s\n\t]+/g, " ").trim()

		const residentVersion = cryb64(content)
		if (residentVersion !== options.version) {
			throw new Error(
				`Server has schema version v${residentVersion} but client requested v${options.version} for database "${name}"`
			)
		}

		const autoMigrateStatement = db.prepare(sql`SELECT crsql_automigrate(?)`)
		const masterInsertStatement = db.prepare(
			sql`INSERT OR REPLACE INTO crsql_master (key, value) VALUES (?, ?)`
		)
		db.transaction(() => {
			autoMigrateStatement.run(content)
			masterInsertStatement.run("schema_version", options.version.toString())
		})()
	} catch (e) {
		db.prepare(sql`SELECT crsql_finalize()`).run()
		db.close()
		throw e
	}

	return wrapDatabase(db)
}
