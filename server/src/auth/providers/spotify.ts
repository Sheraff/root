import { type GrantProvider } from "grant"
import { env } from "~/env"
import { type GrantData, type RawGrant } from "~/auth/providers"

export const options: GrantProvider | undefined = !env.SPOTIFY_CLIENT_ID
	? undefined
	: {
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

export function getIdFromGrant(response: RawGrant["response"]): GrantData | undefined {
	if (!env.SPOTIFY_CLIENT_ID) throw new Error("Spotify credentials not set in environment")
	if (!response.profile) return undefined
	const data = response.profile as SpotifyUser
	return {
		email: data.email,
		provider: "spotify",
		id: data.id,
	}
}
