import { type GrantProvider } from "grant"
import { object, parse, string } from "valibot"
import { type GrantData, type RawGrant } from "server/auth/providers"
import { env } from "server/env"

export const options: GrantProvider | undefined = !env.DISCORD_CLIENT_ID
	? undefined
	: {
			client_id: env.DISCORD_CLIENT_ID,
			client_secret: env.DISCORD_CLIENT_SECRET,
			scope: ["identify"],
			response: ["tokens", "profile"],
			nonce: true,
		}

// type DiscordUser = {
// 	id: string
// 	username: string
// 	avatar: null
// 	discriminator: string
// 	public_flags: number
// 	premium_type: number
// 	flags: number
// 	banner: null
// 	accent_color: null
// 	global_name: string
// 	avatar_decoration_data: null
// 	banner_color: null
// 	mfa_enabled: boolean
// 	locale: string
// 	email: string
// 	verified: boolean
// }

const discordUserShape = object({
	id: string(),
	email: string(),
})

export function getIdFromGrant(response: RawGrant["response"]): GrantData | undefined {
	if (!env.DISCORD_CLIENT_ID) throw new Error("Discord credentials not set in environment")
	if (!response.profile) return undefined
	const data = parse(discordUserShape, response.profile)
	return {
		email: data.email,
		provider: "discord",
		id: data.id,
	}
}
