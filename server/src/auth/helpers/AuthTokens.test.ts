import { describe, expect, it } from "vitest"
import { decrypt, encrypt } from "~/auth/helpers/AuthTokens"

describe("AuthTokens", () => {
	it("decrypts what it encrypts", () => {
		const input = { foo: "bar" }
		const encrypted = encrypt(input)
		const decrypted = decrypt(encrypted)

		expect(decrypted).toEqual({ success: input })
	})
})
