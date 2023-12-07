import { type GrantProvider } from "grant"
import { Grant, UserId } from "~/auth"
import { twitch as twitchProfile } from "grant/config/profile.json"
import { jwtDecode } from "jwt-decode"
import { env } from "~/env"

export const options: GrantProvider = {
	client_id: env.TWITCH_CLIENT_ID,
	client_secret: env.TWITCH_CLIENT_SECRET,
	scope: ["openid", "user:read:email"],
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

export async function getIdFromGrant(grant: Grant): Promise<UserId> {
	const url = new URL(twitchProfile.profile_url)
	url.searchParams.set("id", jwtDecode(grant.response.id_token).sub!)
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${grant.response.access_token}`,
			"Client-Id": env.TWITCH_CLIENT_ID,
		},
	})
	const { data } = (await response.json()) as { data: [TwitchUser] }
	return {
		email: data[0].email,
		provider: "twitch",
		id: data[0].id,
	}
}
