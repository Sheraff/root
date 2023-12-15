import type { FastifyInstance } from "fastify"
import { makeCrsqliteDb, type CrsqliteDatabase } from "~/crsqlite/db"
import { encode, decode, tags, hexToBytes } from "@vlcn.io/ws-common"

export default async function crsqlite(fastify: FastifyInstance, { dbPath }: { dbPath: string }) {
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
		},
	)

	/**
	 * Endpoint that clients can call to `get` or `pull` changes
	 * from the server.
	 */
	fastify.get<{
		Params: { name: string }
		Querystring: {
			schemaName: string
			schemaVersion: string
			requestor: string
			since: string
		}
	}>("/api/changes/:name", {
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
				db = await makeCrsqliteDb(fastify, {
					name: req.params.name,
					schemaName: req.query.schemaName,
					version: BigInt(req.query.schemaVersion),
					dbPath,
				})
			} catch (error: any) {
				if (error.code === "SQLITE_IOERR_WRITE" || error.message?.includes("readonly database")) {
					res.status(400).send({
						message: "make and push changes first to create or migrate the DB on the server.",
					})
					return
				}
				throw error
			}

			try {
				const requestorSiteId = hexToBytes(req.query.requestor)
				const sinceVersion = BigInt(req.query.since)

				const changes = db.getChanges(sinceVersion, requestorSiteId)
				const encoded = encode({
					_tag: tags.Changes,
					changes,
					sender: db.getId(),
					since: [sinceVersion, 0],
				})
				res.header("Content-Type", "application/octet-stream")

				fastify.log.info(`Returning ${changes.length} changes`)
				res.send(encoded)
			} finally {
				db.close()
			}
		},
	})

	/**
	 * Endpoint for clients to post their database changes to.
	 */
	fastify.post<{
		Params: { name: string }
		Querystring: { schemaName: string; schemaVersion: string }
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
			const data = new Uint8Array((req.body as { raw: Buffer }).raw)

			const msg = decode(data)
			if (msg._tag != tags.Changes) {
				throw new Error(`Expected Changes message but got ${msg._tag}`)
			}

			const db = await makeCrsqliteDb(fastify, {
				name: req.params.name,
				schemaName: req.query.schemaName,
				version: BigInt(req.query.schemaVersion),
			})
			try {
				db.applyChanges(msg)
				res.send({ status: "OK" })
			} finally {
				db.close()
			}
		},
	})
}
