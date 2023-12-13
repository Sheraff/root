import type { FastifyInstance } from "fastify"

export function makeDbLogger(fastify: FastifyInstance) {
	return (message?: unknown) => {
		fastify.log.info(message as string)
	}
}
