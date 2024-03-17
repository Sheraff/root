import type { MigrationConfig, MigrationMeta } from "drizzle-orm/migrator"
import type { CRSQLite3Database } from "./driver"
import migrationJournal from "shared/drizzle-migrations/meta/_journal.json"
import { migrations } from "shared/drizzle-migrations/index"
import { sql, type TablesRelationalConfig } from "drizzle-orm"
import type { SQLiteSession } from "drizzle-orm/sqlite-core"

export async function migrate<TSchema extends Record<string, unknown>>(
	db: CRSQLite3Database<TSchema>,
	config: string | MigrationConfig
) {
	const migrations = await getMigrations()
	const migrationsTable = "__drizzle_migrations"
	const migrationTableIdent = sql.identifier(migrationsTable)
	const migrationTableCreate = sql`
		CREATE TABLE IF NOT EXISTS ${migrationTableIdent} (
			id TEXT NOT NULL PRIMARY KEY,
			hash text NOT NULL,
			created_at INTEGER
		)
	`

	// @ts-expect-error -- `session` exists but is marked as `@internal` on the type level
	await (db.session as SQLiteSession<"async", void, TSchema, TablesRelationalConfig>).run(
		migrationTableCreate
	)
	type MigrationEntry = { id: string; hash: string; created_at: number }

	const dbMigrations = await db.get<MigrationEntry | null>(
		sql`SELECT id, hash, created_at FROM ${migrationTableIdent} ORDER BY created_at DESC LIMIT 1`
	)

	const lastDbMigration = dbMigrations ?? undefined

	console.log("migrations", migrations)
	console.log("lastDbMigration", lastDbMigration)
	console.log("dbMigrations", dbMigrations)

	for (const migration of migrations) {
		if (!lastDbMigration || lastDbMigration.created_at < migration.folderMillis) {
			console.log("migrating", migration)
			for (const stmt of migration.sql) {
				await db.run(sql.raw(stmt))
			}

			await db.run(
				sql`INSERT INTO ${migrationTableIdent} ("id", "hash", "created_at") VALUES(${crypto.randomUUID()}, ${migration.hash}, ${migration.folderMillis})`
			)
		}
	}
	console.log("done migrating")

	const dbMigrationsAfter = await db.get<MigrationEntry | undefined>(
		sql`SELECT id, hash, created_at FROM ${migrationTableIdent} ORDER BY created_at DESC LIMIT 1`
	)
	console.log("dbMigrationsAfter", dbMigrationsAfter)
}

export async function getMigrations() {
	const journal = migrationJournal as {
		entries: Array<{ idx: number; when: number; tag: string; breakpoints: boolean }>
	}
	const migrationQueries: MigrationMeta[] = []
	for (const journalEntry of journal.entries) {
		const query = migrations[journalEntry.tag as keyof typeof migrations]
		const result = query.split("--> statement-breakpoint")
		migrationQueries.push({
			sql: result,
			bps: journalEntry.breakpoints,
			folderMillis: journalEntry.when,
			hash: await createSha256Hash(query),
		})
	}
	return migrationQueries
}

/**
 * Cross-platform implementation of node's
 * ```ts
 * crypto.createHash("sha256").update(query).digest("hex")
 * ```
 */
async function createSha256Hash(query: string) {
	const encoder = new TextEncoder()
	const data = encoder.encode(query)
	const hash = await globalThis.crypto.subtle.digest("SHA-256", data)
	const hashArray = Array.from(new Uint8Array(hash))
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
	return hashHex
}
