import "fastify"
import type BetterSqlite3 from "better-sqlite3"

/**
 * Some fastify plugins add properties to fastify interfaces.
 * If these interfaces are accessed by shared code (server + client),
 * the accessed properties should be declared here.
 */
declare module "fastify" {
	interface Session {
		user?: {
			id: string
		}
	}

	interface FastifyRequest {
		session: Session
	}

	interface FastifyInstance {
		auth: {
			db: BetterSqlite3.Database
		}
	}
}
