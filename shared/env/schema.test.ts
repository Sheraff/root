import { describe, expect, it } from "vitest"
import { parseEnv } from "./schema"

describe("parseEnv", () => {
	it("should parse valid environment variables", () => {
		const env = {
			TWITCH_CLIENT_ID: "testClientId",
			TWITCH_CLIENT_SECRET: "testClientSecret",
		}

		const result = parseEnv(env)

		expect(result).toEqual(env)
	})

	it("should throw an error for invalid environment variables", () => {
		const env = {
			TWITCH_CLIENT_ID: "",
			TWITCH_CLIENT_SECRET: "testClientSecret",
		}

		expect(() => parseEnv(env)).toThrowError()
	})

	it("should throw an error for missing environment variables", () => {
		const env = {
			TWITCH_CLIENT_SECRET: "testClientSecret",
		}

		expect(() => parseEnv(env)).toThrowError()
	})
})
