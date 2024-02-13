import { describe, it, expect } from "vitest"
import { replaceParams } from "./replaceParams"

describe("replaceParams", () => {
	it("should replace multiple params, clean the data object", () => {
		const url = "/api/:id/:name"
		const data = { id: 1, name: "foo", other: 2 }
		expect(replaceParams(url, data)).toBe("/api/1/foo")
	})
	it("should replace multiple params in the same url part", () => {
		const url = "/api/:id-:name/end"
		const data = { id: 1, name: "foo", other: 2 }
		expect(replaceParams(url, data)).toBe("/api/1-foo/end")
	})
	it("should ignore double colon", () => {
		const url = "/api/:id/fii::name"
		const data = { id: 1, name: "foo", other: 2 }
		// TODO: in reality, we shouldn't ignore it, just replace it with a single colon
		expect(replaceParams(url, data)).toBe("/api/1/fii::name")
	})
	it("works like fastify route from `find-my-way`, but without the regex and the *", () => {
		expect(
			replaceParams("/example/near/:lat-:lng/radius/:r", {
				lat: "15°N",
				lng: "30°E",
				r: "20",
			})
		).toBe("/example/near/15°N-30°E/radius/20")
		expect(replaceParams("/example/posts/:id?", {})).toBe("/example/posts")
	})
})
