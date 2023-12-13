import { object, string } from "valibot"
import { describe, expect, it } from "vitest"
import { decrypt, encrypt } from "~/auth/helpers/AuthTokens"

describe("AuthTokens", () => {
	it("decrypts what it encrypts", () => {
		const input = { foo: "bar" }
		const schema = object({ foo: string() })
		const encrypted = encrypt(input)
		const decrypted = decrypt(encrypted, schema)

		expect(decrypted).toEqual({ success: input })
	})
})
