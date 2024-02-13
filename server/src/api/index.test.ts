import { afterAll, describe, expect, it } from "vitest"
import api from "."
import fastify from "fastify"

describe.concurrent("api", async () => {
	const app = fastify()
	await app.register(api)
	await app.ready()
	afterAll(() => app.close())
	it("works on open endpoints", async () => {
		const good = await app.inject({
			url: "/api/hello?id=42",
			headers: { "x-id": "42" },
		})
		expect(good.statusCode).toBe(200)
		expect(await good.json()).toEqual({ hello: "world" })
	})
	it("open endpoints can still reject for any reason", async () => {
		const bad = await app.inject({
			url: "/api/hello?id=55",
			headers: { "x-id": "42" },
		})
		expect(bad.statusCode).toBe(404)
		expect(await bad.json()).toEqual({ error: "no" })
	})
	it("rejects unauthorized on protected endpoints", async () => {
		const foo = await app.inject("/api/protected")
		expect(foo.statusCode).toBe(401)
		expect(await foo.json()).toEqual({ error: "unauthorized" })
	})
	it.todo("works on protected endpoints", () => {
		// we would need to create a user in DB, with connected accounts
		// and a session in the store
	})
})
