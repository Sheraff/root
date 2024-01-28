import * as Twitch from "@repo/server/auth/providers/twitch"
import * as Google from "@repo/server/auth/providers/google"
import * as Spotify from "@repo/server/auth/providers/spotify"
import * as Discord from "@repo/server/auth/providers/discord"

export type RawGrant = {
	provider: string
	state: string
	response: {
		id_token: string
		access_token: string
		refresh_token: string
		profile?: unknown
	}
}

/**
 * We assume that every oauth server will be able to provide
 * - an email address (careful, this might not be validated by the server, thus might not be enough to sync multiple providers based on same email)
 * - an id-provider pair that is unique to the user (and could allow to re-retrieve the data)
 */
export type GrantData = {
	email: string
	provider: string
	id: string
}

export function getGrantData(grant: RawGrant) {
	switch (grant.provider) {
		case "twitch":
			return Twitch.getIdFromGrant(grant.response)
		case "google":
			return Google.getIdFromGrant(grant.response)
		case "spotify":
			return Spotify.getIdFromGrant(grant.response)
		case "discord":
			return Discord.getIdFromGrant(grant.response)
	}
}

export const grantOptions = {
	twitch: Twitch.options,
	google: Google.options,
	spotify: Spotify.options,
	discord: Discord.options,
}
