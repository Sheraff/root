import { type GrantProvider } from "grant"
import { Grant, UserId } from "~/auth"
import { env } from "~/env"

export const options: GrantProvider = {
	client_id: env.TWITCH_CLIENT_ID,
	client_secret: env.TWITCH_CLIENT_SECRET,
	scope: ["openid", "user:read:email"],
	response: ["tokens", "profile"],
	callback: "/api/oauth",
	nonce: true,
}

type TwitchUser = {
	id: string
	login: string
	display_name: string
	type: string
	broadcaster_type: string
	description: string
	profile_image_url: string
	offline_image_url: string
	view_count: number
	email: string
	created_at: string
}

export function getIdFromGrant(response: Grant["response"]): UserId | undefined {
	if (!response.profile) return undefined
	const { data } = response.profile as { data: [TwitchUser] }
	return {
		email: data[0].email,
		provider: "twitch",
		id: data[0].id,
	}
}
