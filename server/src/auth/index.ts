import { type FastifyInstance } from "fastify"
import cookie from "@fastify/cookie"
import session from "@fastify/session"
import grant from "grant"
import * as Twitch from "~/auth/twitch"

export type Grant = {
	provider: string
	state: string
	response: {
		id_token: string
		access_token: string
		refresh_token: string
		profile: unknown
	}
}

/**
 * We assume that every oauth server will be able to provide
 * - an email address (careful, this might not be validated by the server, thus might not be enough to sync multiple providers based on same email)
 * - an id-provider pair that is unique to the user (and could allow to re-retrieve the data)
 */
export type UserId = {
	email: string
	provider: string
	id: string
}

declare module "fastify" {
	interface Session {
		grant?: Grant
	}
}

/**
 * Auth flow:
 * 1. user clicks on "login with twitch" button, front-end goes to /api/oauth/twitch
 * 2. grant redirects to twitch, twitch redirects to /api/oauth/twitch/callback
 * 3. grant redirects to /api/oauth
 * 4. /api/oauth collects the data it needs from the grant, sets a cookie to scope SQL queries to the user, and redirects to /
 */
async function auth(fastify: FastifyInstance) {
	fastify.register(cookie, {
		// hook: "onRequest", // see lifecycle hooks: https://fastify.dev/docs/latest/Reference/Lifecycle/
		// logLevel: "info",
	})
	fastify.register(session, {
		// TODO: this should be an env secret
		secret: "rostra-gasp-genitive-focal-civility-dairy-alehouse",
		cookie: { secure: false },
		// TODO: use DB for session store
		// store: {
		// 	destroy(sessionId, callback) {},
		// 	get(sessionId, callback) {},
		// 	set(sessionId, session, callback) {},
		// },
	})
	const grantPlugin = grant.fastify()
	const grantInstance = grantPlugin({
		defaults: {
			origin: "http://localhost:3001",
			transport: "session",
			state: true,
			prefix: "/api/oauth",
		},
		twitch: Twitch.options,
	})
	fastify.register(grantInstance)
	fastify.route({
		method: "GET",
		url: "/api/oauth",
		handler: async (req, res) => {
			if (!req.session.grant) {
				res.redirect(303, "/")
				return
			}
			switch (req.session.grant.provider) {
				case "twitch": {
					const data = Twitch.getIdFromGrant(req.session.grant.response)
					/**
					 * TODO: do something with data... store in db? communicate something to frontend?
					 * We need to know
					 * - whether the user is logged in
					 * - which DB to sync / query (for now we assume 1 sqlite DB file per user)
					 */
					res.header("Set-Cookie", `user=${data.id}; Path=/; SameSite=Strict`)
					res.redirect(302, "/")
					return
				}
				default: {
					res.status(500).send("unknown provider")
					return
				}
			}
		},
	})
	return fastify
}

export default Object.assign(auth, {
	/**
	 * this makes the decorators added in this plugin
	 * (session, cookie, grant, etc.)
	 * persist outside of the scope of this plugin.
	 * This makes other plugins able to read the session
	 * and cookie data.
	 *
	 * @see {@link https://fastify.dev/docs/latest/Reference/Plugins#handle-the-scope}
	 */
	[Symbol.for("skip-override")]: true,
})
