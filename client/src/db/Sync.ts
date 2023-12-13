import { sql } from "shared/sql"
import type { CtxAsync } from "@vlcn.io/react"
import { encode, decode, tags, bytesToHex } from "@vlcn.io/ws-common"
import { useState, useEffect } from "react"

type DBAsync = CtxAsync["db"]
type StmtAsync = Awaited<ReturnType<DBAsync["prepare"]>>

type SyncArgs = Readonly<{
	db: DBAsync
	name: string
	schemaName: string
	schemaVersion: bigint
	pullChangesetStmt: StmtAsync
	applyChangesetStmt: StmtAsync
	siteId: Uint8Array
}>

class Sync {
	private readonly args: SyncArgs
	private readonly syncEndpoint

	static endpoint = "/api/changes"

	constructor(args: SyncArgs) {
		this.args = args
		this.syncEndpoint = `${Sync.endpoint}/${args.name}?schemaName=${args.schemaName}&schemaVersion=${args.schemaVersion}`
	}

	key(key: string) {
		return `${this.args.db.siteid}-${key}-${this.args.name}`
	}

	get lastSent(): bigint {
		const key = this.key("last-sent-to")
		const value = localStorage.getItem(key) ?? 0
		return BigInt(value)
	}

	set lastSent(value: string | number | bigint) {
		const key = this.key("last-sent-to")
		const val = value.toString(10)
		localStorage.setItem(key, val)
	}

	get lastSeen(): bigint {
		const key = this.key("last-seen-from")
		const value = localStorage.getItem(key) ?? 0
		return BigInt(value)
	}

	set lastSeen(value: string | number | bigint) {
		const key = this.key("last-seen-from")
		const val = value.toString(10)
		localStorage.setItem(key, val)
	}

	async pushChanges() {
		// track what we last sent to the server so we only send the diff.
		const lastSentVersion = this.lastSent

		// gather our changes to send to the server
		const changes = await this.args.pullChangesetStmt.all(null, lastSentVersion)
		if (changes.length === 0) {
			console.log("[DB] No changes to send")
			return
		}

		const encoded = encode({
			_tag: tags.Changes,
			changes,
			sender: this.args.siteId,
			since: [lastSentVersion, 0],
		})

		console.log(`[DB] Sending ${changes.length} changes since ${lastSentVersion}`)

		const response = await fetch(this.syncEndpoint, {
			method: "POST",
			body: encoded,
			headers: {
				"Content-Type": "application/octet-stream",
			},
		})

		// Record that we've sent up to the given db version to the server
		// so next sync will be a delta.
		if (response.ok) {
			this.lastSent = changes[changes.length - 1][5]
		} else {
			const txt = (await response.json()) as any
			throw new Error(txt.message || txt)
		}

		return changes.length
	}

	async pullChanges() {
		const lastSeenVersion = this.lastSeen
		const endpoint =
			this.syncEndpoint +
			`&requestor=${bytesToHex(this.args.siteId)}&since=${lastSeenVersion.toString(10)}`

		const response = await fetch(endpoint)
		if (!response.ok) {
			const txt = (await response.json()) as any
			throw new Error(txt.message || txt)
		}
		const msg = decode(new Uint8Array(await response.arrayBuffer()))
		if (msg._tag !== tags.Changes) {
			throw new Error(`[DB] Expected changes, got ${msg._tag}`)
		}

		if (msg.changes.length === 0) {
			console.debug("[DB] No changes received")
			return
		}

		await this.args.db.tx(async (tx) => {
			for (const c of msg.changes) {
				await this.args.applyChangesetStmt.run(
					tx,
					c[0],
					c[1],
					c[2],
					c[3],
					c[4],
					c[5],
					// record who send us the change
					msg.sender,
					c[7],
					c[8],
				)
			}
		})

		console.log(`[DB] Received ${msg.changes.length} changes since ${lastSeenVersion}`)

		// Record that we've seen up to the given db version from the server
		// so next sync will be a delta.
		this.lastSeen = msg.changes.at(-1)![5]

		return msg.changes.length
	}

	destroy() {
		this.args.applyChangesetStmt.finalize(null)
		this.args.pullChangesetStmt.finalize(null)
	}
}

async function createSync(db: CtxAsync["db"], room: string) {
	const [schemaNameRow] = await db.execA<[string]>(
		sql`SELECT value FROM crsql_master WHERE key = 'schema_name'`,
	)
	const schemaName = schemaNameRow?.[0]
	if (!schemaName) {
		throw new Error("[DB] The database does not have a schema applied.")
	}

	const [schemaVersionRow] = await db.execA<[number | bigint | undefined]>(
		sql`SELECT value FROM crsql_master WHERE key = 'schema_version'`,
	)
	const schemaVersion = BigInt(schemaVersionRow?.[0] ?? -1)

	const [pullChangesetStmt, applyChangesetStmt] = await Promise.all([
		db.prepare(sql`
			SELECT "table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq" 
			FROM crsql_changes 
			WHERE db_version > ? AND site_id IS NULL
		`),
		db.prepare(sql`
			INSERT INTO crsql_changes ("table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq")
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
	])
	pullChangesetStmt.raw(true)

	const [siteIdRow] = await db.execA<[Uint8Array]>(sql`SELECT crsql_site_id()`)
	const siteId = siteIdRow?.[0]

	if (!siteId) {
		throw new Error("[DB] Could not determine site id")
	}

	return new Sync({
		db,
		name: room,
		schemaName,
		schemaVersion,
		pullChangesetStmt,
		applyChangesetStmt,
		siteId,
	})
}

export function useSync(db: DBAsync, name: string) {
	const [sync, setSync] = useState<Sync | null>(null)

	useEffect(() => {
		let mounted = true
		const sync = createSync(db, name)

		sync.then((s) => {
			if (!mounted) {
				return
			}
			setSync(s)
		})

		return () => {
			mounted = false
			sync.then((s) => s.destroy())
		}
	}, [db, name])

	return sync
}
