import fastify from "fastify"
import api from "server/api"
import auth from "server/auth"
import push from "server/push"
import frontend from "server/frontend"
import { env } from "server/env"
import crsqlite from "server/crsqlite"
import { DB_ROOT } from "server/utils/dbRoot"
import { fooBar } from "shared/foo/bar"

fooBar()

// Create a Fastify instance
const app = fastify({
	logger: {
		// TODO: use ≠ loggers for dev and prod, w/ log rotation in prod (or do we want pm2 to handle that?)
		transport: {
			target: "pino-pretty",
			options: {
				translateTime: "HH:MM:ss Z",
				ignore: "pid,hostname",
				sync: process.env.NODE_ENV !== "production",
			},
		},
	},
})

app.get("/health", { logLevel: "silent" }, (_, res) => res.status(200).send("OK"))

/**
 * Register the auth routes + session management.
 *
 * Reserves the following routes:
 * - GET /api/oauth/connect/:provider
 * - GET /api/oauth/connect/:provider/callback
 * - GET /api/oauth/finalize
 * - GET /api/oauth/invite
 * - POST /api/oauth/invite
 * - DELETE /api/oauth/session
 *
 * Also adds the `auth` decorator to the Fastify instance.
 */
void app.register(auth, {
	dbPath: DB_ROOT,
})
/**
 * Register the push notification routes.
 *
 * Reserves the following routes:
 * - GET /api/push/handshake
 * - POST /api/push/handshake
 *
 * Requires the auth plugin to be registered first.
 *
 * Also adds the `notify` decorator to the Fastify instance.
 */
void app.register(push)

/**
 * Register the DB Sync routes.
 *
 * Reserves the following routes:
 * - GET /api/changes/:name
 * - POST /api/changes/:name
 */
void app.register(crsqlite, {
	dbPath: DB_ROOT,
})

/**
 * Register the API routes.
 */
void app.register(api)

/**
 * Register the frontend routes.
 *
 * In production mode, we serve the client built by Vite.
 *
 * Reserves all remaining routes.
 */
if (process.env.NODE_ENV === "production") {
	void app.register(frontend)
}

// Start the server
const start = () => {
	const port = process.env.NODE_ENV === "production" ? env.PORT : 8877
	try {
		void app.listen({
			port,
			host: "localhost",
			listenTextResolver: (address) =>
				process.env.NODE_ENV === "production"
					? `Listening on ${address}`
					: `API server started`,
		})
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		process.on("SIGINT", async () => {
			console.log("\nSIGINT received, shutting down...")
			await app.close().catch(console.error)
			console.log("Server shut down, exiting.")
			process.exit(0)
		})
	} catch (err) {
		app.log.error(err as any)
		process.exit(1)
	}
}

start()
