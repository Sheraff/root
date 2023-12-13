import { type GrantProvider } from "grant"
import { type GrantData, type RawGrant } from "~/auth/providers"
import { env } from "~/env"

export const options: GrantProvider | undefined = !env.DISCORD_CLIENT_ID
	? undefined
	: {
			client_id: env.DISCORD_CLIENT_ID,
			client_secret: env.DISCORD_CLIENT_SECRET,
			scope: ["identify"],
			response: ["tokens", "profile"],
			nonce: true,
	  }

type DiscordUser = {
	id: string
	username: string
	avatar: null
	discriminator: string
	public_flags: number
	premium_type: number
	flags: number
	banner: null
	accent_color: null
	global_name: string
	avatar_decoration_data: null
	banner_color: null
	mfa_enabled: boolean
	locale: string
	email: string
	verified: boolean
}

export function getIdFromGrant(response: RawGrant["response"]): GrantData | undefined {
	if (!env.DISCORD_CLIENT_ID) throw new Error("Discord credentials not set in environment")
	if (!response.profile) return undefined
	const data = response.profile as DiscordUser
	return {
		email: data.email,
		provider: "discord",
		id: data.id,
	}
}
