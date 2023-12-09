import { describe, expect, it } from "vitest"
import { decrypt, encrypt } from "~/auth/helpers/AuthTokens"

describe("AuthTokens", () => {
	it("decrypts what it encrypts", () => {
		const input = { foo: "bar" }
		const encrypted = encrypt(input)
		const decrypted = decrypt(encrypted)

		expect(decrypted).toEqual({ success: input })
	})

	it("decrypts this", () => {
		expect(
			decrypt(
				"2e718cb0c4b548baa60c7d89a7808d4e13536cd8c75dc168e57885748833972d21b66cad59d59b201314655b3f3b009899df787041ba3329253f36c477efc2841ca68088d22f5bdf3053ccc0c3796ad08bc326b4c36717975521f0a39ad6132e33343236349a547903b968ace06c15e1ec624c0573ed",
			),
		).toEqual({ success: { mode: "create" } })
	})
})
