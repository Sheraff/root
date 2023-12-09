import { describe, it, expect } from "vitest"
import { helloWorld } from "./world"

describe("shared/foo/bar", () => {
	it("should work", () => {
		expect(helloWorld()).toBe("helloWorld")
	})
})
