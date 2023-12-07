import fastify from "fastify"
import { fooBar } from "@shared/foo/bar"
import api from "~/api"
import auth from "~/auth"
import frontend from "~/frontend"

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

// Register the auth routes + session management
app.register(auth)

// in production mode, we serve the client built by Vite
if (process.env.NODE_ENV === "production") {
	app.register(frontend)
}

// Register the API routes
app.register(api)

// Start the server
const start = async () => {
	try {
		await app.listen({
			// TODO: use env var for port (and for switching between private port and public port between dev and prod)
			port: process.env.NODE_ENV === "production" ? 3001 : 3000,
			host: "localhost",
			listenTextResolver: (address) =>
				process.env.NODE_ENV === "production" ? `Listening on ${address}` : `API server started`,
		})
	} catch (err) {
		app.log.error(err)
		process.exit(1)
	}
}

start()
