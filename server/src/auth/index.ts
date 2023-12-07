import { type FastifyInstance } from "fastify"
import cookie from "@fastify/cookie"
import session from "@fastify/session"
import grant from "grant"
import * as Twitch from "~/auth/twitch"
import { authDB } from "~/db/authDB"
import { makeStore } from "~/auth/SessionStore"

export type Grant = {
	provider: string
	state: string
	response: {
		id_token: string
		access_token: string
		refresh_token: string
		profile?: unknown
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
 * 3. grant creates a session (incl. provider, provider id, email, jwt) redirects to /
 *
 * Client-side "am I logged in?" flow:
 * 1. front-end calls /api/session
 * 2. /api/session returns the provider, email, and provider user id if the user is logged in, or a 401 if not
 *
 * Client-side "logout" flow:
 * 1. front-end calls DELETE /api/session
 *
 *
 *
 * Use "invite codes"
 * - Only with an invite code an oauth session can be turned into an account.
 * - User can create an invite code, connect with a ≠ oauth provider, then both are linked to the same account.
 *
 */
async function auth(fastify: FastifyInstance) {
	return fastify
		.register(cookie, {
			// hook: "onRequest", // see lifecycle hooks: https://fastify.dev/docs/latest/Reference/Lifecycle/
			// logLevel: "info",
		})
		.register(session, {
			// TODO: this should be an env secret
			secret: "rostra-gasp-genitive-focal-civility-dairy-alehouse",
			cookie: { secure: false },
			// TODO: use DB for session store
			store: makeStore(authDB),
			cookieName: "sessionId",
		})
		.register(
			grant.fastify()({
				defaults: {
					origin: "http://localhost:3001",
					transport: "session",
					state: true,
					prefix: "/api/oauth",
				},
				twitch: Twitch.options,
			}),
		)
		.addHook("onSend", (req, res, payload, done) => {
			if (!req.session?.grant) {
				res.setCookie("user", "", { path: "/", sameSite: "strict", maxAge: 0 })
				return done(null, payload)
			}
			let data: UserId | undefined = undefined
			switch (req.session.grant.provider) {
				case "twitch": {
					data = Twitch.getIdFromGrant(req.session.grant.response)
					break
				}
			}
			if (data) {
				res.setCookie("user", data.id, { path: "/", sameSite: "strict", maxAge: 2147483647 })
			} else {
				res.setCookie("user", "", { path: "/", sameSite: "strict", maxAge: 0 })
			}
			return done(null, payload)
		})
		.get("/api/session", async function (req, res) {
			if (req.session.grant) {
				switch (req.session.grant.provider) {
					case "twitch": {
						const data = Twitch.getIdFromGrant(req.session.grant.response)
						if (data) {
							return res.send(data)
						}
					}
				}
			}
			res.status(401).send({ error: "unauthorized" })
			return
		})
		.delete("/api/session", async function (req, res) {
			req.session.destroy((err) => {
				if (err) {
					console.error(err)
					res.status(500).send({ error: "internal server error" })
					return
				}
				res.send({ message: "session destroyed" })
				return
			})
		})
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
