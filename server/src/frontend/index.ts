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
	const clientDir = path.join(__dirname, "../../dist/client")
	fastify.register(fastifyStatic, {
		root: clientDir,
		prefix: "/",
	})
	const swDir = path.join(__dirname, "../../dist/sw")
	fastify.get("/sw.js", function (req, reply) {
		reply.sendFile("sw.js", swDir)
	})
	fastify.get("/sw.js.map", function (req, reply) {
		reply.sendFile("sw.js.map", swDir)
	})
	return fastify
}
