import fastify from "fastify"
import api from "server/api"
import auth from "server/auth"
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
			},
		},
	},
})

/**
 * Register the auth routes + session management.
 * Reserves the following routes:
 * - GET /api/oauth/connect/:provider
 * - GET /api/oauth/connect/:provider/callback
 * - GET /api/oauth/finalize
 * - GET /api/oauth/invite
 * - POST /api/oauth/invite
 * - DELETE /api/oauth/session
 */
app.register(auth, {
	dbPath: DB_ROOT,
})

/**
 * Register the DB Sync routes.
 * Reserves the following routes:
 * - GET /api/changes/:name
 * - POST /api/changes/:name
 */
app.register(crsqlite, {
	dbPath: DB_ROOT,
})

// Register the API routes
app.register(api)

// in production mode, we serve the client built by Vite
if (process.env.NODE_ENV === "production") {
	app.register(frontend)
}

// Start the server
const start = async () => {
	const port = process.env.NODE_ENV === "production" ? env.PORT : env.DEV_PROXY_SERVER_PORT ?? 8123
	try {
		await app.listen({
			port,
			host: "localhost",
			listenTextResolver: (address) =>
				process.env.NODE_ENV === "production" ? `Listening on ${address}` : `API server started`,
		})
		process.on("SIGINT", async () => {
			console.log("\nSIGINT received, shutting down...")
			await app.close()
			console.log("Server shut down, exiting.")
			process.exit(0)
		})
	} catch (err) {
		app.log.error(err as any)
		process.exit(1)
	}
}

start()
