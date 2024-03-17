import type { MigrationConfig, MigrationMeta } from "drizzle-orm/migrator"
import type { CRSQLite3Database } from "./driver"
import migrationJournal from "shared/drizzle-migrations/meta/_journal.json"
import { migrations } from "shared/drizzle-migrations/index"

export async function migrate<TSchema extends Record<string, unknown>>(
	db: CRSQLite3Database<TSchema>,
	config: string | MigrationConfig
) {
	const migrations = await getMigrations()
	db.dialect.migrate(migrations, db.session, config)
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

async function createSha256Hash(query: string) {
	const encoder = new TextEncoder()
	const data = encoder.encode(query)
	const hash = await window.crypto.subtle.digest("SHA-256", data)
	const hashArray = Array.from(new Uint8Array(hash))
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
	return hashHex
}
