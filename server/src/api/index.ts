import { type FastifyInstance } from "fastify"

export default async function routes(fastify: FastifyInstance) {
	fastify.get("/api/hello", async (request, reply) => {
		console.log("hello world")
		reply.header("Access-Control-Allow-Origin", "*")
		return { hello: "world" }
	})
	fastify.get(
		"/api/protected",
		{
			preHandler: (request, reply, done) => {
				if (!request.session?.grant) {
					console.log("no session")
					console.log(request)
					reply.status(401).send({ error: "unauthorized" })
					return done()
				}
				// TODO: what do we need to check to make sure the user is authorized?
				done()
			},
		},
		(request, reply) => {
			console.log("hello protected world")
			reply.header("Access-Control-Allow-Origin", "*")
			return { hello: "protected world" }
		},
	)
}
