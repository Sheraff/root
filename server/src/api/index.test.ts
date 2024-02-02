import { afterAll, describe, expect, it } from "vitest"
import api from "."
import fastify from "fastify"

describe.concurrent("api", async () => {
	const app = fastify()
	app.register(api)
	await app.ready()
	afterAll(() => app.close())
	it("works", async () => {
		const foo = await app.inject("/api/hello")
		expect(foo.statusCode).toBe(200)
		expect(await foo.json()).toEqual({ hello: "world" })
	})
	it("rejects unauthorized", async () => {
		const foo = await app.inject("/api/protected")
		expect(foo.statusCode).toBe(401)
		expect(await foo.json()).toEqual({ error: "unauthorized" })
	})
})
