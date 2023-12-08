import { FastifyRequest, type FastifyInstance } from "fastify"
import cookie from "@fastify/cookie"
import session from "@fastify/session"
import grant from "grant"
import * as Twitch from "~/auth/providers/twitch"
import * as Google from "~/auth/providers/google"
import * as Spotify from "~/auth/providers/spotify"
import * as Discord from "~/auth/providers/discord"
import { authDB } from "~/db/authDB"
import { makeStore } from "~/auth/SessionStore"
import { makeInviteCodes } from "~/auth/InviteCodes"
import { maxLength, object, parse, string } from "valibot"
import { sql } from "@shared/sql"
import crypto from "node:crypto"
import { env } from "~/env"
import { PUBLIC_CONFIG } from "@shared/env/publicConfig"
import { decrypt, encrypt } from "~/auth/AuthTokens"

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
		user?: {
			email: string
			id: string
		}
	}
}

/**
 * Auth flow:
 * 1. user clicks on "login with twitch" button, front-end goes to /api/oauth/twitch
 * 2. grant redirects to twitch, twitch redirects to /api/oauth/twitch/callback
 * 3. grant creates a session (incl. provider, provider id, email, jwt) redirects to /
 * 4. user provides an invite code, front-end calls /api/oauth/invite, if code is valid, account is created from session (and user is created if needed)
 *
 * Client-side "am I logged in?" flow:
 * 1. front-end calls /api/oauth/session
 * 2. /api/oauth/session returns either
 * 	- a { user } object if the user is logged in
 * 	- a { session } object if the user has an oauth session but no account
 * 	- a 401 error if the user is not logged in
 *
 * Client-side "logout" flow:
 * 1. front-end calls DELETE /api/oauth/session
 *
 *
 * TODO: invert order of account creation
 * 	=> provide invite first (validate on server, store nonce in cookie)
 * 	=> then redirect to "pick your provider" page
 * 	=> after oauth flow, land on /api/oauth/finalize, check nonce in cookie, if valid, create account
 * 	=> then redirect to /
 *
 * TODO: linking accounts
 * 	=> if user is logged in, show "link your account" button, clicking it stores nonce in a cookie and logs out the user
 * 	=> then redirect to "pick your provider" page
 * 	=> after oauth flow, land on /api/oauth/finalize, check nonce in cookie, if valid, link account
 * 	=> then redirect to /
 *
 */
async function auth(fastify: FastifyInstance) {
	const sessionStore = makeStore(authDB)
	const invitesStore = makeInviteCodes(authDB)

	fastify.register(cookie, {
		// hook: "onRequest", // see lifecycle hooks: https://fastify.dev/docs/latest/Reference/Lifecycle/
		// logLevel: "info",
	})

	fastify.register(session, {
		secret: env.SESSION_COOKIE_SECRET,
		cookie: { secure: process.env.NODE_ENV === "production" },
		store: sessionStore,
		cookieName: "session",
	})

	fastify.register(
		grant.fastify()({
			defaults: {
				origin: "http://localhost:3001",
				transport: "session",
				state: true,
				prefix: "/api/oauth/connect",
				callback: "/api/oauth/finalize",
			},
			twitch: Twitch.options,
			google: Google.options,
			spotify: Spotify.options,
			discord: Discord.options,
		}),
	)

	fastify.post(
		"/api/oauth/invite",
		{
			schema: {
				body: {
					type: "object",
					properties: {
						code: { type: "string" },
					},
					required: ["code"],
				},
			},
		},
		function (req, res) {
			let inviteCode: string
			try {
				const parsed = parse(object({ code: string([maxLength(50)]) }), req.body)
				inviteCode = parsed.code
			} catch (err) {
				console.error(err)
				res.status(400)
				return res.send({ error: "invalid code format" })
			}
			const valid = invitesStore.validate(inviteCode)
			if (!valid) {
				res.status(403)
				return res.send({ error: "invalid code" })
			}
			const token = encrypt({ mode: "create" })
			res.setCookie(PUBLIC_CONFIG.accountCreationCookie, token, {
				path: "/",
				sameSite: "lax",
				maxAge: 3_600,
			})
			res.status(200)
			return res.send({ message: "invite accepted, proceed to /api/oauth/connect/:provider" })
		},
	)

	fastify.get("/api/oauth/invite", function (req, res) {
		if (!req.session?.grant) {
			res.status(401)
			return res.send({ error: "unauthorized" })
		}

		const user = getUserFromSession(req)
		if (!user) {
			res.status(401)
			return res.send({ error: "unauthorized" })
		}
		res.setCookie(PUBLIC_CONFIG.userIdCookie, user.id, {
			path: "/",
			sameSite: "lax",
			maxAge: 2147483647,
		})

		const token = encrypt({ mode: "link", id: user.id })
		res.setCookie(PUBLIC_CONFIG.accountCreationCookie, token, {
			path: "/",
			sameSite: "lax",
			maxAge: 3_600,
		})
		res.status(200)
		return res.send({ message: "linking accounts, proceed to /api/oauth/connect/:provider" })
	})

	const createUserStatement = authDB.prepare<{
		userId: string
		email: string
	}>(
		sql`
		INSERT INTO users
		VALUES (@userId, @email);`,
	)

	const checkAccountExistsStatement = authDB.prepare<{
		userId: string
		provider: string
		providerUserId: string
	}>(
		sql`
		SELECT EXISTS(
			SELECT 1
			FROM accounts
			WHERE user_id = @userId AND provider = @provider AND provider_user_id = @providerUserId
		);`,
	)

	const createAccountStatement = authDB.prepare<{
		accountId: string
		userId: string
		provider: string
		providerUserId: string
	}>(
		sql`
		INSERT INTO accounts
		VALUES (@accountId, @userId, @provider, @providerUserId, datetime('now'));`,
	)

	const createUserAccount = authDB.transaction(
		(
			user: { userId: string; email: string },
			account: { accountId: string; userId: string; provider: string; providerUserId: string },
		) => {
			createUserStatement.run(user)
			createAccountStatement.run(account)
		},
	)

	const linkUserAccount = authDB.transaction(
		(account: { accountId: string; userId: string; provider: string; providerUserId: string }) => {
			const exists = checkAccountExistsStatement.get(account)
			if (!exists) {
				createAccountStatement.run(account)
			}
		},
	)

	fastify.get("/api/oauth/finalize", function (req, res) {
		res.setCookie(PUBLIC_CONFIG.accountCreationCookie, "", {
			path: "/",
			sameSite: "lax",
			maxAge: 0,
		})

		// check session, obtained after oauth flow
		if (!req.session?.grant) {
			res.status(401)
			return res.send({ error: "unauthorized", debug: "no session" })
		}
		let sessionData: UserId | undefined = undefined
		switch (req.session.grant.provider) {
			case "twitch": {
				sessionData = Twitch.getIdFromGrant(req.session.grant.response)
				break
			}
			case "google": {
				sessionData = Google.getIdFromGrant(req.session.grant.response)
				break
			}
			case "spotify": {
				sessionData = Spotify.getIdFromGrant(req.session.grant.response)
				break
			}
			case "discord": {
				sessionData = Discord.getIdFromGrant(req.session.grant.response)
				break
			}
		}
		if (!sessionData) {
			res.status(401)
			return res.send({ error: "unauthorized", debug: "no session data" })
		}

		// check if user already exists
		const user = getUserFromSession(req)
		if (user) {
			res.setCookie(PUBLIC_CONFIG.userIdCookie, user.id, {
				path: "/",
				sameSite: "lax",
				maxAge: 2147483647,
			})
			linkUserAccount({
				accountId: crypto.randomUUID(),
				userId: user.id,
				provider: sessionData.provider,
				providerUserId: sessionData.id,
			})
			console.log("user already exists, linking account")
			return res.redirect(302, "/")
		}

		// check account creation cookie, obtained from invite flow
		const token = req.cookies[PUBLIC_CONFIG.accountCreationCookie]
		if (!token) {
			res.status(401)
			return res.send({ error: "unauthorized", debug: "no account creation cookie" })
		}
		const result = decrypt<{ mode: "create" } | { mode: "link"; id: string }>(token)
		if ("error" in result) {
			res.status(401)
			return res.send({ error: "unauthorized", debug: "invalid account creation cookie" })
		}

		if (result.success.mode === "create") {
			const userId = crypto.randomUUID()
			const accountId = crypto.randomUUID()
			createUserAccount(
				{ userId, email: sessionData.email },
				{
					userId,
					accountId,
					provider: sessionData.provider,
					providerUserId: sessionData.id,
				},
			)
			return res.redirect(302, "/")
		} else {
			const accountId = crypto.randomUUID()
			linkUserAccount({
				accountId,
				userId: result.success.id,
				provider: sessionData.provider,
				providerUserId: sessionData.id,
			})
			return res.redirect(302, "/")
		}
	})

	const userFromSessionStatement = authDB.prepare<{
		id: string
	}>(
		sql`
			SELECT users.id as id, users.email as email
			FROM sessions
			INNER JOIN accounts ON sessions.provider_user_id = accounts.provider_user_id AND sessions.provider = accounts.provider
			INNER JOIN users ON accounts.user_id = users.id
			WHERE sessions.id = @id AND datetime('now') < datetime(expires_at)`,
	)

	const getUserFromSession = (req: FastifyRequest) => {
		if (req.session.user) return req.session.user

		const user = userFromSessionStatement.get({ id: req.session.sessionId }) as
			| { id: string; email: string }
			| undefined

		if (user) {
			req.session.set("user", user)
			req.session.save()
			return user
		}

		return undefined
	}

	fastify.addHook("onSend", (req, res, payload, done) => {
		if (!req.session?.grant) {
			res.setCookie(PUBLIC_CONFIG.userIdCookie, "", { path: "/", sameSite: "lax", maxAge: 0 })
			return done(null, payload)
		}
		if (req.session.user) {
			return done(null, payload)
		}

		const user = getUserFromSession(req)

		if (user) {
			res.setCookie(PUBLIC_CONFIG.userIdCookie, user.id, {
				path: "/",
				sameSite: "lax",
				maxAge: 2147483647,
			})
			return done(null, payload)
		}

		res.setCookie(PUBLIC_CONFIG.userIdCookie, "", { path: "/", sameSite: "lax", maxAge: 0 })
		return done(null, payload)
	})

	fastify.get("/api/oauth/session", function (req, res) {
		if (!req.session) {
			res.status(401)
			return res.send({ error: "unauthorized" })
		}
		const user = userFromSessionStatement.get({ id: req.session.sessionId }) as
			| { id: string; email: string }
			| undefined
		if (user) {
			return res.send({ user })
		}

		if (req.session.grant) {
			switch (req.session.grant.provider) {
				case "twitch": {
					const session = Twitch.getIdFromGrant(req.session.grant.response)
					if (session) {
						return res.send({ session })
					}
				}
				case "google": {
					const session = Google.getIdFromGrant(req.session.grant.response)
					if (session) {
						return res.send({ session })
					}
				}
				case "spotify": {
					const session = Spotify.getIdFromGrant(req.session.grant.response)
					if (session) {
						return res.send({ session })
					}
				}
				case "discord": {
					const session = Discord.getIdFromGrant(req.session.grant.response)
					if (session) {
						return res.send({ session })
					}
				}
			}
		}
		res.status(401)
		return res.send({ error: "unauthorized" })
	})

	fastify.delete("/api/oauth/session", function (req, res) {
		req.session.destroy((err) => {
			if (err) {
				console.error(err)
				res.status(500)
				return res.send({ error: "internal server error" })
			}
			return res.send({ message: "session destroyed" })
		})
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
