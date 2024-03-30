import type { MigrationMeta } from "drizzle-orm/migrator"
import migrationJournal from "shared/drizzle-migrations/meta/_journal.json"
import { migrations } from "shared/drizzle-migrations/index"

/**
 * TODO: this should be done at build-time through Vite `define` config
 */
export async function getMigrations() {
	const journal = migrationJournal as {
		entries: Array<{ idx: number; when: number; tag: string; breakpoints: boolean }>
	}
	const migrationQueries: MigrationMeta[] = []
	for (const journalEntry of journal.entries) {
		const query = migrations[journalEntry.tag as keyof typeof migrations] as string
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
