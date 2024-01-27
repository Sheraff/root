import { describe, expect, it } from "vitest"
import { fooBar } from "./bar"

describe("fooBar", () => {
	it("returns fooBar", () => {
		expect(fooBar()).toBe("fooBar")
	})
})
