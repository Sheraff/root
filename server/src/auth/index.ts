import { type FastifyRequest, type FastifyInstance } from "fastify"
import cookie from "@fastify/cookie"
import session, { type SessionStore } from "@fastify/session"
import grant from "grant"
import { grantOptions, getGrantData, type RawGrant } from "server/auth/providers"
import { makeAuthDb } from "server/auth/db"
import { makeStore } from "server/auth/helpers/SessionStore"
import { makeInviteCodes } from "server/auth/helpers/InviteCodes"
import { literal, maxLength, object, parse, string, union } from "valibot"
import { sql } from "shared/sql"
import crypto from "node:crypto"
import { env } from "server/env"
import { PUBLIC_CONFIG } from "shared/env/publicConfig"
import { decrypt, encrypt } from "server/auth/helpers/AuthTokens"
import type BetterSqlite3 from "better-sqlite3"

declare module "fastify" {
	interface Session {
		/** Only temporarily added between /api/oauth/connect/:provider/callback and /api/oauth/finalize. */
		grant?: RawGrant
		user?: {
			email: string
			id: string
		}
		provider?: string
		provider_user_id?: string
		provider_email?: string
	}

	interface FastifyInstance {
		auth: {
			db: BetterSqlite3.Database
			sessionStore: SessionStore
			invitesStore: ReturnType<typeof makeInviteCodes>
		}
	}
}

/**
 * Auth flow:
 * 1. user provides an invite code, front-end calls /api/oauth/invite, if code is valid, an empty encrypted token is left in a cookie
 * 2. user clicks on "login with twitch" button, front-end goes to /api/oauth/connect/twitch
 * 3. grant redirects to twitch, twitch redirects to /api/oauth/connect/twitch/callback
 * 4. grant creates a session (incl. provider, provider id, email, jwt) redirects to /api/oauth/finalize
 * 5. we check the session & the encrypted token in the cookie, if valid, we create an account and redirect to /
 *
 * Linking accounts flow:
 * 1. user is logged in, clicks on "link account to X" button, front-end calls /api/oauth/invite, we check session, an encrypted token with user id is left in a cookie
 * 2. client navigates to /api/oauth/connect/X, ... (same as above) ... redirects to /api/oauth/finalize
 * 3. we check the session & the encrypted token in the cookie, if valid, we link the account and redirect to /
 *
 * Client-side "am I logged in?" flow:
 * 1. assume user is logged in if there is a "user" cookie (it's ok being wrong here, we'll check more securely on the server)
 * 1. regularly call /api/oauth/session (cookie change, offline-to-online change, etc.)
 * 2. /api/oauth/session returns either
 * 	- a { user } object if the user is logged in
 * 	- a { session } object if the user has an oauth session but no account
 * 	- a 401 error if the user is not logged in
 *
 * Client-side "logout" flow:
 * 1. front-end calls DELETE /api/oauth/session
 *
 */
function auth(fastify: FastifyInstance, { dbPath }: { dbPath: string }, done: () => void) {
	const authDB = makeAuthDb(fastify, { dbPath })
	const sessionStore = makeStore(authDB)
	const invitesStore = makeInviteCodes(authDB)

	fastify.decorate("auth", {
		db: authDB,
		sessionStore,
		invitesStore,
	})

	fastify.addHook("onClose", (fastify, done) => {
		fastify.log.info("Closing auth database...")
		console.log("Closing auth database...")
		authDB.close()
		sessionStore.close()
		invitesStore.close()
		fastify.log.info("Auth database closed.")
		console.log("Auth database closed.")
		done()
	})

	fastify.register(cookie, {
		// hook: "onRequest", // see lifecycle hooks: https://fastify.dev/docs/latest/Reference/Lifecycle/
		// logLevel: "info",
	})

	fastify.register(session, {
		secret: env.SESSION_COOKIE_SECRET,
		cookie: {
			secure: false, // TODO: set to true when using HTTPS
			sameSite: "lax",
			maxAge: 50 * 24 * 60 * 60, // 50 days
		},
		store: sessionStore,
		cookieName: "session",
		saveUninitialized: true,
		logLevel: "info",
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
			...grantOptions,
		})
	)

	const createUserStatement = authDB.prepare<{
		userId: string
		email: string
	}>(sql`INSERT INTO users VALUES (@userId, @email);`)

	const createAccountStatement = authDB.prepare<{
		accountId: string
		userId: string
		provider: string
		providerUserId: string
	}>(
		sql`INSERT INTO accounts VALUES (@accountId, @userId, @provider, @providerUserId, datetime('now'));`
	)

	const createAccountWhereNotExistsStatement = authDB.prepare<{
		accountId: string
		userId: string
		provider: string
		providerUserId: string
	}>(
		sql`INSERT OR IGNORE INTO accounts VALUES (@accountId, @userId, @provider, @providerUserId, datetime('now'))`
	)

	const createUserAccount = authDB.transaction(
		(
			user: { userId: string; email: string },
			account: { accountId: string; userId: string; provider: string; providerUserId: string }
		) => {
			createUserStatement.run(user)
			createAccountStatement.run(account)
		}
	)

	const userFromSessionStatement = authDB.prepare<{
		id: string
	}>(
		sql`SELECT users.id as id, users.email as email
			FROM sessions
			INNER JOIN accounts ON sessions.provider_user_id = accounts.provider_user_id AND sessions.provider = accounts.provider
			INNER JOIN users ON accounts.user_id = users.id
			WHERE sessions.id = @id AND datetime('now') < datetime(expires_at)`
	)

	function getUserFromSession(req: FastifyRequest) {
		if (req.session.user) return req.session.user

		const user = userFromSessionStatement.get({ id: req.session.sessionId }) as
			| { id: string; email: string }
			| undefined

		return user
	}

	const userFromGrantStatement = authDB.prepare<{
		provider: string
		id: string
	}>(
		sql`SELECT users.id as id, users.email as email
			FROM accounts
			INNER JOIN users ON accounts.user_id = users.id
			WHERE accounts.provider_user_id = @id AND accounts.provider = @provider`
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
				fastify.log.error(err as any)
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
		}
	)

	fastify.get("/api/oauth/invite", function (req, res) {
		const userId = req.session.user?.id
		if (!userId) {
			res.status(401)
			return res.send({ error: "unauthorized" })
		}

		const token = encrypt({ mode: "link", id: userId })
		res.setCookie(PUBLIC_CONFIG.accountCreationCookie, token, {
			path: "/",
			sameSite: "lax",
			maxAge: 3_600,
		})
		res.status(200)
		return res.send({ message: "linking accounts, proceed to /api/oauth/connect/:provider" })
	})

	fastify.get("/api/oauth/finalize", function (req, res) {
		res.setCookie(PUBLIC_CONFIG.accountCreationCookie, "", {
			path: "/",
			sameSite: "lax",
			maxAge: 0,
		})

		// check session, obtained after oauth flow
		if (!req.session?.grant) {
			res.status(401)
			fastify.log.warn("no session")
			return res.send({ error: "unauthorized" })
		}
		const grantData = getGrantData(req.session.grant)
		req.session.set("grant", null)
		if (!grantData) {
			res.status(401)
			fastify.log.warn("no session data")
			return res.send({ error: "unauthorized" })
		}

		// check if user already exists for this session
		const user =
			getUserFromSession(req) ||
			(userFromGrantStatement.get(grantData) as { id: string; email: string } | undefined)
		if (user) {
			createAccountWhereNotExistsStatement.run({
				accountId: crypto.randomUUID(),
				userId: user.id,
				provider: grantData.provider,
				providerUserId: grantData.id,
			})
			if (!req.session.user) {
				req.session.set("user", user)
				req.session.set("provider", grantData.provider)
				req.session.set("provider_user_id", grantData.id)
				req.session.set("provider_email", grantData.email)
			}
			return res.redirect(302, "/")
		}

		// check account creation cookie, obtained from invite flow
		const token = req.cookies[PUBLIC_CONFIG.accountCreationCookie]
		if (!token) {
			res.status(401)
			fastify.log.warn("no account creation cookie")
			return res.send({ error: "unauthorized" })
		}
		const tokenSchema = union([
			object({ mode: literal("create") }),
			object({ mode: literal("link"), id: string() }),
		])
		const result = decrypt(token, tokenSchema)
		if ("error" in result) {
			res.status(401)
			fastify.log.warn("invalid account creation cookie")
			return res.send({ error: "unauthorized" })
		}

		req.session.set("provider", grantData.provider)
		req.session.set("provider_user_id", grantData.id)
		req.session.set("provider_email", grantData.email)

		if (result.success.mode === "create") {
			const userId = crypto.randomUUID()
			const accountId = crypto.randomUUID()
			createUserAccount(
				{ userId, email: grantData.email },
				{
					userId,
					accountId,
					provider: grantData.provider,
					providerUserId: grantData.id,
				}
			)
			req.session.set("user", { id: userId, email: grantData.email })
			return res.redirect(302, "/")
		} else {
			const accountId = crypto.randomUUID()
			createAccountWhereNotExistsStatement.run({
				accountId,
				userId: result.success.id,
				provider: grantData.provider,
				providerUserId: grantData.id,
			})
			req.session.set("user", { id: result.success.id, email: grantData.email })
			return res.redirect(302, "/")
		}
	})

	fastify.addHook("onSend", (req, res, payload, done) => {
		if (req.session?.user) {
			res.setCookie(PUBLIC_CONFIG.userIdCookie, req.session.user.id, {
				path: "/",
				sameSite: "lax",
				maxAge: 2147483647,
			})
			return done(null, payload)
		} else {
			res.setCookie(PUBLIC_CONFIG.userIdCookie, "", { path: "/", sameSite: "lax", maxAge: 0 })
			return done(null, payload)
		}
	})

	fastify.delete("/api/oauth/session", function (req, res) {
		req.session.destroy((err) => {
			if (err) {
				fastify.log.error(err)
				res.status(500)
				return res.send({ error: "internal server error" })
			}
			return res.send({ message: "session destroyed" })
		})
	})

	done()
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
