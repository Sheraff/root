import type { FastifyInstance, FastifyError } from "fastify"
import { makeCrsqliteDb, type CrsqliteDatabase } from "server/crsqlite/db"
import { encode, decode, tags, hexToBytes } from "@vlcn.io/ws-common"
import { compressBuffer } from "script/compressBuffer"
import schema from "assets/test-v0.sql"
import type { SqliteError } from "server/types/Sqlite"

export default function crsqlite(
	fastify: FastifyInstance,
	{ dbPath }: { dbPath: string },
	done: () => void
) {
	fastify.addContentTypeParser(
		"application/octet-stream",
		{ parseAs: "buffer" },
		(req, body, done) => {
			try {
				done(null, {
					raw: body,
				})
			} catch (e: any) {
				const error = e as FastifyError
				error.statusCode = 400
				done(error, undefined)
			}
		}
	)

	let lastDb: {
		name: string
		version: bigint
		dbPath?: string
		db: CrsqliteDatabase
	} | null = null

	fastify.addHook("onClose", (fastify, done) => {
		if (lastDb) {
			fastify.log.info("Closing crsqlite database...")
			console.log("Closing crsqlite database...")
			lastDb.db.close()
			lastDb = null
			fastify.log.info("Closed crsqlite database")
			console.log("Closed crsqlite database")
		}
		done()
	})

	function getDb(name: string, version: bigint) {
		if (
			lastDb &&
			lastDb.name === name &&
			lastDb.version === version &&
			lastDb.dbPath === dbPath
		) {
			return lastDb.db
		}
		lastDb?.db.close()
		lastDb = null
		const db = makeCrsqliteDb(fastify, {
			name,
			version,
			schema,
			dbPath,
		})
		lastDb = {
			name,
			version,
			dbPath,
			db,
		}
		return db
	}

	/**
	 * Endpoint for clients to post their database changes to,
	 * and get the changes from other clients.
	 */
	fastify.post<{
		Params: { name: string }
		Querystring: {
			schemaVersion: string
			requestor: string
			since: string
		}
	}>("/api/changes/:name", {
		config: {
			rawBody: true,
		},
		schema: {
			params: {
				properties: {
					name: { type: "string" },
				},
				required: ["name"],
				type: "object",
			},
			querystring: {
				properties: {
					schemaVersion: { type: "string" },
					requestor: { type: "string" },
					since: { type: "string" },
				},
				required: ["schemaVersion", "requestor", "since"],
				type: "object",
			},
		},
		onRequest(request, reply, done) {
			if (!request.session?.user) {
				fastify.log.warn("/api/changes/:name ::: unauthorized")
				void reply.status(401).send({ error: "unauthorized" })
				return done()
			}
			done()
		},
		async handler(req, res) {
			let db: CrsqliteDatabase
			try {
				db = getDb(req.params.name, BigInt(req.query.schemaVersion))
			} catch (e: any) {
				const error = e as SqliteError
				if (
					error.code === "SQLITE_IOERR_WRITE" ||
					error.message.includes("readonly database")
				) {
					void res.status(400).send({
						message:
							"make and push changes first to create or migrate the DB on the server.",
					})
					return
				}
				throw error
			}

			const data = new Uint8Array((req.body as { raw: Buffer }).raw)
			if (data.length > 0) {
				const msg = decode(data)
				if (msg._tag !== tags.Changes) {
					void res.header("Vlcn-Accept-Changes", `error=${msg._tag}`)
				} else {
					fastify.log.info(`Applying ${msg.changes.length} changes`)
					db.applyChanges(msg)
					void res.header("Vlcn-Accept-Changes", `ok`)
				}
			}

			const requestorSiteId = hexToBytes(req.query.requestor)
			const sinceVersion = BigInt(req.query.since)

			const changes = db.getChanges(sinceVersion, requestorSiteId)
			const encoded = encode({
				_tag: tags.Changes,
				changes,
				sender: db.getId(),
				since: [sinceVersion, 0],
			})
			void res.header("Content-Type", "application/octet-stream")

			if (encoded.byteLength < 1501) {
				void res.send(encoded)
				fastify.log.info(`Returning ${changes.length} changes`)
			} else {
				const compressed = await compressBuffer(encoded, 3)
				void res.header("Content-Encoding", "br")
				void res.send(compressed)
				const percent = Math.round((compressed.byteLength / encoded.byteLength) * 100)
				fastify.log.info(
					`Returning ${changes.length} changes, compressed to ${percent}% (${encoded.byteLength} -> ${compressed.byteLength})`
				)
			}
		},
	})

	done()
}
