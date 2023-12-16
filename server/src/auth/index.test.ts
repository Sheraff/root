import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import auth from "~/auth"
import fastify, { type FastifyInstance, type Session } from "fastify"
import type BetterSqlite3 from "better-sqlite3"
import { sql } from "shared/sql"
import { makeAuthDb } from "~/auth/db"
import type { SessionStore } from "@fastify/session"
import { makeStore } from "~/auth/helpers/SessionStore"
import crypto from "node:crypto"

// mock database to make it a singleton
vi.mock("~/auth/db", async () => {
	const { default: Database } = await import("better-sqlite3")
	const { default: schemaContent } = await import("~/auth/schema.sql")
	const db = new Database(":memory:")
	db.pragma("journal_mode = WAL")
	db.pragma("synchronous = NORMAL")
	db.exec(schemaContent)
	return {
		makeAuthDb: () => db,
	}
})

// mock SessionStore to make it a singleton
vi.mock("~/auth/helpers/SessionStore", async (importOriginal) => {
	let memo: SessionStore | undefined
	const mod = await importOriginal()
	return {
		makeStore: (db: BetterSqlite3.Database) => {
			if (memo) return memo
			return (memo = (mod as any).makeStore(db))
		},
	}
})

describe("api", () => {
	let app: FastifyInstance
	let db: BetterSqlite3.Database
	let store: SessionStore

	beforeAll(async () => {
		app = fastify()
		db = makeAuthDb(app)
		store = makeStore(db)
		app.register(auth)
		await app.ready()
	})

	afterAll(async () => {
		db.close()
		await app.close()
	})

	it("creates a database with the correct schema", () => {
		const tables = db
			.prepare(
				sql`SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';`,
			)
			.all() as { name: string }[]
		expect(tables.map((t) => t.name)).toEqual(["users", "sessions", "accounts", "invites"])
	})

	it("accepts an invite code", async () => {
		const { code } = db.prepare(sql`SELECT code FROM invites LIMIT 1`).get() as { code: string }

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
		const { code } = db.prepare(sql`SELECT code FROM invites LIMIT 1`).get() as { code: string }
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
		store.set(sessionId, sessionData, () => {})

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
		const user = db.prepare(sql`SELECT email from users WHERE id = @id`).get({ id: endUser }) as
			| { email: string }
			| undefined
		expect(user).toBeTruthy()
		expect(user?.email).toBe("foo")
	})
})
