import type { FastifyInstance } from "fastify"
import { makeCrsqliteDb, type CrsqliteDatabase } from "@repo/server/crsqlite/db"
import { encode, decode, tags, hexToBytes } from "@vlcn.io/ws-common"
import { compressBuffer } from "@repo/script/compressBuffer"
import schema from "@repo/assets/test-v0.sql"

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
			} catch (error: any) {
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

	async function getDb(name: string, version: bigint) {
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
		const db = await makeCrsqliteDb(fastify, {
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
		onRequest(request, reply, done) {
			if (!request.session?.user) {
				fastify.log.warn("/api/changes/:name ::: unauthorized")
				reply.status(401).send({ error: "unauthorized" })
				return done()
			}
			done()
		},
		async handler(req, res) {
			let db: CrsqliteDatabase
			try {
				db = await getDb(req.params.name, BigInt(req.query.schemaVersion))
			} catch (error: any) {
				if (
					error.code === "SQLITE_IOERR_WRITE" ||
					error.message?.includes("readonly database")
				) {
					res.status(400).send({
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
					res.header("Vlcn-Accept-Changes", `error=${msg._tag}`)
				} else {
					fastify.log.info(`Applying ${msg.changes.length} changes`)
					db.applyChanges(msg)
					res.header("Vlcn-Accept-Changes", `ok`)
				}
			}

			const requestorSiteId = hexToBytes(req.query.requestor!)
			const sinceVersion = BigInt(req.query.since!)

			const changes = db.getChanges(sinceVersion, requestorSiteId)
			const encoded = encode({
				_tag: tags.Changes,
				changes,
				sender: db.getId(),
				since: [sinceVersion, 0],
			})
			res.header("Content-Type", "application/octet-stream")

			if (encoded.byteLength < 1501) {
				fastify.log.info(`Returning ${changes.length} changes`)
				res.send(encoded)
			} else {
				const compressed = await compressBuffer(encoded, 3)
				const percent = Math.round((compressed.byteLength / encoded.byteLength) * 100)
				fastify.log.info(
					`Returning ${changes.length} changes, compressed to ${percent}% (${encoded.byteLength} -> ${compressed.byteLength})`
				)
				res.header("Content-Encoding", "br")
				res.send(compressed)
			}
		},
	})

	done()
}
