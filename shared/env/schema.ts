import { string, parse, object } from "valibot"

const envSchema = object({
	TWITCH_CLIENT_ID: string(),
	TWITCH_CLIENT_SECRET: string(),
})

export function parseEnv(env: Record<string, unknown>) {
	return parse(envSchema, env)
}
