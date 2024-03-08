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
	it("should interpret double colon as 'single colon, not a param'", () => {
		const url = "/api/:id/fii::name"
		const data = { id: 1, name: "foo", other: 2 }
		expect(replaceParams(url, data)).toBe("/api/1/fii:name")
		expect(replaceParams("/foo::bar/::baz", {})).toBe("/foo:bar/:baz")
		expect(replaceParams("/foo::bar:baz:qux/foo", { baz: 1, qux: 2 })).toBe("/foo:bar12/foo")
	})
	it("works like fastify route from `find-my-way`, but without the regex and the *", () => {
		expect(
			replaceParams("/example/near/:lat-:lng/radius/:r", {
				lat: "15°N",
				lng: "30°E",
				r: "20",
			})
		).toBe("/example/near/15°N-30°E/radius/20")
		expect(replaceParams("/example/:id?", {})).toBe("/example")
		expect(replaceParams("/example/:id?", { id: 2 })).toBe("/example/2")
		expect(replaceParams("/foo/:f.png", { f: "hello" })).toBe("/foo/hello.png")
		expect(replaceParams("/foo/:f.:ext", { f: "hello", ext: "png" })).toBe("/foo/hello.png")
	})
	it("has the same edge-cases as `find-my-way`", () => {
		// only the last param can be made optional
		expect(replaceParams("/example/:id?/coco", { id: 2 })).toBe("/example/2?/coco")
		// so not passing a param will throw
		expect(() => replaceParams("/example/:id?/coco", {})).toThrowError("No value for key id")
	})
})
