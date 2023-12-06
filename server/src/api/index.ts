import { FastifyInstance } from "fastify"

export default async function routes(fastify: FastifyInstance) {
	fastify.get("/api/hello", async (request, reply) => {
		console.log("hello world")
		reply.header("Access-Control-Allow-Origin", "*")
		return { hello: "world" }
	})
}
