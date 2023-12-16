import { afterEach, beforeEach, describe, expect, it } from "vitest"
import auth from "~/auth"
import fastify, { type FastifyInstance, type Session } from "fastify"
import { sql } from "shared/sql"
import crypto from "node:crypto"

describe(
	"api",
	() => {
		let app: FastifyInstance
		beforeEach(async () => {
			app = fastify()
			await app.register(auth)
			await app.ready()
		})
		afterEach(() => app.close())

		it("creates a database with the correct schema", async () => {
			const tables = app.auth.db
				.prepare(
					sql`SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';`,
				)
				.all() as { name: string }[]
			expect(tables.map((t) => t.name)).toEqual(["users", "sessions", "accounts", "invites"])
		})

		it("accepts an invite code", async () => {
			const { code } = app.auth.db.prepare(sql`SELECT code FROM invites LIMIT 1`).get() as {
				code: string
			}

			expect(code).not.toBeUndefined()
			expect(typeof code).toBe("string")

			const foo = await app.inject({
				path: "/api/oauth/invite",
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({ code }),
			})
			expect(foo.statusCode).toBe(200)
			expect(await foo.json()).toEqual({
				message: "invite accepted, proceed to /api/oauth/connect/:provider",
			})
			const setCookies = foo.headers["set-cookie"] as string[]
			const token = setCookies
				.find((c) => c.startsWith("account_creation="))!
				.split(";")[0]!
				.split("=")[1]!
			expect(token).toBeTruthy()

			const session = setCookies
				.find((c) => c.startsWith("session="))!
				.split(";")[0]!
				.split("=")[1]!
			expect(session).toBeTruthy()

			const user = setCookies
				.find((c) => c.startsWith("user="))!
				.split(";")[0]!
				.split("=")[1]!
			expect(user).toBe("")
		})

		it("starts oauth flow", async () => {
			const bar = await app.inject({
				path: "/api/oauth/connect/twitch",
				method: "GET",
			})
			expect(bar.statusCode).toBe(302)
			expect(bar.headers.location).toMatch(/twitch\.tv\/oauth2\/authorize/)
		})

		it("completes oauth flow", async () => {
			// get account_creation cookie
			const { code } = app.auth.db.prepare(sql`SELECT code FROM invites LIMIT 1`).get() as {
				code: string
			}
			const res = await app.inject({
				path: "/api/oauth/invite",
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({ code }),
			})
			const setCookies = res.headers["set-cookie"] as string[]
			const token = setCookies
				.find((c) => c.startsWith("account_creation="))!
				.split(";")[0]!
				.split("=")[1]!
			const session = setCookies
				.find((c) => c.startsWith("session="))!
				.split(";")[0]!
				.split("=")[1]!
			const sessionId = session.split(".")[0]!

			// create fake session
			const sessionData: Session = {
				cookie: {
					originalMaxAge: null,
				},
				provider: "twitch",
				grant: {
					state: "",
					provider: "twitch",
					response: {
						id_token: "",
						access_token: "",
						refresh_token: "",
						profile: {
							data: [
								{
									email: "foo",
									id: "bar",
								},
							],
						},
					},
				},
			}
			expect(process.env.SESSION_COOKIE_SECRET).toBeTruthy()
			expect(process.env.SESSION_COOKIE_SECRET?.length).toBeGreaterThan(31)
			const secret = process.env.SESSION_COOKIE_SECRET!
			const hash = crypto
				.createHmac("sha256", secret)
				.update(sessionId)
				.digest("base64")
				.replace(/=/g, "")
				.replace(/-/g, "+")
				.replace(/_/g, "/")
			app.auth.sessionStore.set(sessionId, sessionData, () => {})

			// simulate post-grant redirect
			const foo = await app.inject({
				path: "/api/oauth/finalize",
				method: "GET",
				headers: {
					cookie: `account_creation=${token}; session=${sessionId}.${hash}`,
				},
			})
			expect(foo.statusCode).toBe(302)
			expect(foo.headers.location).toBe("/")

			const endSetCookies = foo.headers["set-cookie"] as string[]
			const endAccountCreation = endSetCookies
				.find((c) => c.startsWith("account_creation="))!
				.split(";")[0]!
				.split("=")[1]!
			expect(endAccountCreation).toBe("")
			const endUser = endSetCookies
				.find((c) => c.startsWith("user="))!
				.split(";")[0]!
				.split("=")[1]!
			expect(endUser).toBeTruthy()

			// check that user was created
			const user = app.auth.db
				.prepare(sql`SELECT email from users WHERE id = @id`)
				.get({ id: endUser }) as { email: string } | undefined
			expect(user).toBeTruthy()
			expect(user?.email).toBe("foo")
		})
	},
	{ sequential: true },
)
