import { describe, expect, it, vi } from "vitest"
import { decrypt, encrypt } from "~/auth/helpers/AuthTokens"

vi.mock("~/env", async () => {
	return {
		env: {
			SESSION_COOKIE_SECRET: "michel-michel-michel-michel-michel-michel-michel",
		},
	}
})

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
				"33e140b463dd9362e93c455d4ec53b18196b4f6bf5263167a29a337d83e8fb65424acf25933a0d327d7a6f16f5a0c9e2910b92258ecf42375fcb7cb3a23d01bee28df968c22db87baefa203d46309e06bb0ee242a482264f3e2f1874d24f4f73353432363934f56915638776c8d650fccb81b1441a13",
			),
		).toEqual({ success: { mode: "create" } })
	})
})
