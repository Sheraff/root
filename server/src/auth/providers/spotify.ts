import { type GrantProvider } from "grant"
import { Grant, UserId } from "~/auth"
import { env } from "~/env"

export const options: GrantProvider = {
	client_id: env.SPOTIFY_CLIENT_ID,
	client_secret: env.SPOTIFY_CLIENT_SECRET,
	scope: ["user-read-email", "user-read-private"],
	response: ["tokens", "profile"],
	nonce: true,
}

type SpotifyUser = {
	display_name: string
	external_urls: {
		spotify: string
	}
	href: string
	id: string
	images: string[]
	type: string
	uri: string
	followers: {
		href: null
		total: number
	}
	country: string
	product: string
	explicit_content: {
		filter_enabled: boolean
		filter_locked: boolean
	}
	email: string
}

export function getIdFromGrant(response: Grant["response"]): UserId | undefined {
	if (!response.profile) return undefined
	const data = response.profile as SpotifyUser
	return {
		email: data.email,
		provider: "spotify",
		id: data.id,
	}
}
