import { type FastifyInstance } from "fastify"

export default function routes(fastify: FastifyInstance, opts: object, done: () => void) {
	fastify.get("/api/hello", async () => {
		fastify.log.info("hello world")
		return { hello: "world" }
	})

	fastify.get("/api/protected", {
		onRequest(request, reply, done) {
			if (!request.session?.user) {
				fastify.log.warn("/api/protected ::: unauthorized")
				reply.status(401).send({ error: "unauthorized" })
				return done()
			}
			done()
		},
		handler() {
			fastify.log.info("hello protected world")
			return { hello: "protected world" }
		},
	})

	done()
}
