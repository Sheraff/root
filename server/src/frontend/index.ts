import { type FastifyInstance } from "fastify"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fastifyStatic from "@fastify/static"

/**
 * Use `@fastify/static` to serve the `dist/client` directory.
 */
export default async function frontend(fastify: FastifyInstance) {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	const clientDistPath = path.join(__dirname, "../../dist/client")
	fastify.register(fastifyStatic, {
		root: clientDistPath,
		prefix: "/",
		setHeaders(res) {
			res.setHeader("Service-Worker-Allowed", "/")
		},
	})
	return fastify
}
