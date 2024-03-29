import { string, parse, object, minLength, optional, transform } from "valibot"

const serverEnvSchema = object({
	PORT: transform(string([minLength(4)]), (port) => parseInt(port, 10)),
	DEV_PROXY_SERVER_PORT: optional(
		transform(string([minLength(4)]), (port) => parseInt(port, 10))
	),

	SESSION_COOKIE_SECRET: string([minLength(32)]),

	TWITCH_CLIENT_ID: optional(string([minLength(1)])),
	TWITCH_CLIENT_SECRET: optional(string([minLength(1)])),

	GOOGLE_CLIENT_ID: optional(string([minLength(1)])),
	GOOGLE_CLIENT_SECRET: optional(string([minLength(1)])),

	SPOTIFY_CLIENT_ID: optional(string([minLength(1)])),
	SPOTIFY_CLIENT_SECRET: optional(string([minLength(1)])),

	GITHUB_CLIENT_ID: optional(string([minLength(1)])),
	GITHUB_CLIENT_SECRET: optional(string([minLength(1)])),

	DISCORD_CLIENT_ID: optional(string([minLength(1)])),
	DISCORD_CLIENT_SECRET: optional(string([minLength(1)])),
})

export function parseServerEnv(env: Record<string, unknown>) {
	return parse(serverEnvSchema, env)
}
