import { object, string } from "valibot"
import { describe, expect, it } from "vitest"
import { decrypt, encrypt } from "./AuthTokens"

describe.concurrent("AuthTokens", () => {
	const schema = object({ foo: string() })
	it("decrypts what it encrypts", () => {
		const input = { foo: "bar" }
		const encrypted = encrypt(input)
		const decrypted = decrypt(encrypted, schema)

		expect(encrypted).not.toEqual(input)
		expect(typeof encrypted).toBe("string")
		expect(decrypted).toEqual({ success: input })
	})
	it("returns {error} object when decrypting invalid token", () => {
		expect(decrypt("foo", schema)).toEqual({ error: expect.any(Error) })
	})
})
