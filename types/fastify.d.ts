import "fastify"
import type BetterSqlite3 from "better-sqlite3"

/**
 * Some fastify plugins add properties to fastify interfaces.
 * If these interfaces are accessed by shared code (server + client),
 * the accessed properties should be declared here.
 */
declare module "fastify" {
	interface User {
		id: string
	}

	interface Session {
		user?: User
	}

	interface FastifyRequest {
		session: Session
	}

	interface Auth {
		db: BetterSqlite3.Database
	}

	interface FastifyInstance {
		auth: Auth
	}
}
