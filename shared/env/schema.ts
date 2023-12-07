import { string, parse, object, minLength } from "valibot"

const envSchema = object({
	TWITCH_CLIENT_ID: string([minLength(1)]),
	TWITCH_CLIENT_SECRET: string([minLength(1)]),
})

export function parseEnv(env: Record<string, unknown>) {
	return parse(envSchema, env)
}
