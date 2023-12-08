import { type GrantProvider } from "grant"
import { Grant, UserId } from "~/auth"
import { env } from "~/env"

export const options: GrantProvider = {
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

export function getIdFromGrant(response: Grant["response"]): UserId | undefined {
	if (!response.profile) return undefined
	const data = response.profile as DiscordUser
	return {
		email: data.email,
		provider: "discord",
		id: data.id,
	}
}
