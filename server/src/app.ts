import fastify from "fastify"
import path from "node:path"
import { fileURLToPath } from "node:url"
import apiRoutes from "~/api"
import fastifyStatic from "@fastify/static"
import { fooBar } from "@shared/foo/bar"

fooBar()

// Create a Fastify instance
const app = fastify({
	logger: {
		transport: {
			target: "pino-pretty",
			options: {
				translateTime: "HH:MM:ss Z",
				ignore: "pid,hostname",
			},
		},
	},
})

// in production mode, we serve the client built by Vite
if (process.env.NODE_ENV === "production") {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	const clientDistPath = path.join(__dirname, "../../dist/client")
	app.register(fastifyStatic, {
		root: clientDistPath,
		prefix: "/",
	})
}

// Register the API routes
app.register(apiRoutes)

// Start the server
const start = async () => {
	try {
		await app.listen({
			port: 3000,
			listenTextResolver: (address) =>
				process.env.NODE_ENV === "production" ? `Listening on ${address}` : `API server started`,
		})
	} catch (err) {
		app.log.error(err)
		process.exit(1)
	}
}

start()
