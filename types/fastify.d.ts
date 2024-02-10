import "fastify"

declare module "fastify" {
	interface Session {
		user?: object
	}

	interface FastifyRequest {
		session: Session
	}
}
