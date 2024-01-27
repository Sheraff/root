import { type GrantProvider } from "grant"
import { env } from "server/env"
import { type GrantData, type RawGrant } from "server/auth/providers"
import { array, minLength, object, parse, string } from "valibot"

export const options: GrantProvider | undefined = !env.TWITCH_CLIENT_ID
	? undefined
	: {
			client_id: env.TWITCH_CLIENT_ID,
			client_secret: env.TWITCH_CLIENT_SECRET,
			scope: ["openid", "user:read:email"],
			response: ["tokens", "profile"],
			nonce: true,
		}

// type TwitchUser = {
// 	id: string
// 	login: string
// 	display_name: string
// 	type: string
// 	broadcaster_type: string
// 	description: string
// 	profile_image_url: string
// 	offline_image_url: string
// 	view_count: number
// 	email: string
// 	created_at: string
// }

const twitchUserShape = object({
	data: array(
		object({
			email: string(),
			id: string(),
		}),
		[minLength(1)]
	),
})

export function getIdFromGrant(response: RawGrant["response"]): GrantData | undefined {
	if (!env.TWITCH_CLIENT_ID) throw new Error("Twitch credentials not set in environment")
	if (!response.profile) return undefined
	const { data } = parse(twitchUserShape, response.profile)
	return {
		email: data[0]!.email,
		provider: "twitch",
		id: data[0]!.id,
	}
}
