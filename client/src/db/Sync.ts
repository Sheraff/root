import { sql } from "shared/sql"
import type { CtxAsync } from "@vlcn.io/react"
import { encode, decode, tags, bytesToHex, type Change } from "@vlcn.io/ws-common"
import { useState, useEffect } from "react"

type DBAsync = CtxAsync["db"]
type StmtAsync = Awaited<ReturnType<DBAsync["prepare"]>>

type SyncArgs = Readonly<{
	db: DBAsync
	name: string
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
		this.syncEndpoint = `${Sync.endpoint}/${args.name}?schemaVersion=${args.schemaVersion}`
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

	async roundTrip() {
		// track what we last sent to the server so we only send the diff.
		const lastSentVersion = this.lastSent
		const lastSeenVersion = this.lastSeen
		const params = new URLSearchParams({
			schemaVersion: this.args.schemaVersion.toString(10),
			requestor: bytesToHex(this.args.siteId),
			since: lastSeenVersion.toString(10),
		})
		const headers = new Headers({
			"Content-Type": "application/octet-stream",
			Accept: "application/octet-stream, application/json",
		})
		const endpoint = `/api/changes/${this.args.name}?${params.toString()}`

		// gather our changes to send to the server
		const changes = (await this.args.pullChangesetStmt.all(null, lastSentVersion)) as Readonly<
			Change[]
		>

		const requestBody =
			changes.length === 0
				? new Uint8Array(0)
				: encode({
						_tag: tags.Changes,
						changes,
						sender: this.args.siteId,
						since: [lastSentVersion, 0],
					})

		console.log(`[DB] Sending ${changes.length} changes since ${lastSentVersion}`)

		const response = await fetch(endpoint, {
			method: "POST",
			body: requestBody,
			headers,
		})

		if (!response.ok) {
			const txt = (await response.json()) as Error
			throw new Error(txt.message)
		}

		// SENT CHANGES
		if (changes.length) {
			const sentChangesResult = response.headers.get("Vlcn-Accept-Changes")
			if (sentChangesResult === "ok") {
				// Record that we've sent up to the given db version to the server
				// so next sync will be a delta.
				this.lastSent = changes[changes.length - 1]![5]
			} else {
				const [, error] = sentChangesResult?.split("=") ?? []
				console.error(
					new Error(
						`[DB] Server rejected changes: needed Changes message, received ${error} tag`
					)
				)
			}
		}

		//// RECEIVED CHANGES
		const msg = decode(new Uint8Array(await response.arrayBuffer()))
		if (msg._tag !== tags.Changes) {
			console.error(new Error(`[DB] Expected changes, got ${msg._tag}`))
		} else if (msg.changes.length === 0) {
			console.debug("[DB] No changes received")
		} else {
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
						c[8]
					)
				}
			})

			console.log(`[DB] Received ${msg.changes.length} changes since ${lastSeenVersion}`)

			// Record that we've seen up to the given db version from the server
			// so next sync will be a delta.
			this.lastSeen = msg.changes.at(-1)![5]
		}
	}

	destroy() {
		this.args.applyChangesetStmt.finalize(null).catch(console.error)
		this.args.pullChangesetStmt.finalize(null).catch(console.error)
	}
}

async function createSync(db: CtxAsync["db"], room: string) {
	const [schemaVersionRow] = await db.execA<[number | bigint | undefined]>(
		sql`SELECT value FROM crsql_master WHERE key = 'schema_version'`
	)
	if (!schemaVersionRow) {
		throw new Error("[DB] The database does not have a schema applied.")
	}
	const schemaVersion = BigInt(schemaVersionRow?.[0] ?? -1)

	const [pullChangesetStmt, applyChangesetStmt] = await Promise.all([
		db.prepare(sql`
			SELECT "table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq" 
			FROM crsql_changes 
			WHERE db_version > ? AND site_id = crsql_site_id()
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
		schemaVersion,
		pullChangesetStmt,
		applyChangesetStmt,
		siteId,
	})
}

export function useSync(db: DBAsync | undefined, name: string | undefined) {
	const [sync, setSync] = useState<Sync | null>(null)

	useEffect(() => {
		if (!db || !name) return
		let mounted = true
		const sync = createSync(db, name)

		sync.then((s) => {
			if (!mounted) {
				return
			}
			setSync(s)
		}, console.error)

		return () => {
			mounted = false
			sync.then((s) => s.destroy(), console.error)
		}
	}, [db, name])

	return sync
}
