import { type GrantProvider } from "grant"
import { env } from "~/env"
import { type GrantData, type RawGrant } from "~/auth/providers"

export const options: GrantProvider | undefined = !env.GOOGLE_CLIENT_ID
	? undefined
	: {
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			scope: ["openid", "https://www.googleapis.com/auth/userinfo.email"],
			response: ["tokens", "profile"],
			nonce: true,
	  }

type GoogleUser = {
	sub: string
	picture: string
	email: string
	email_verified: boolean
	hd: string
}

export function getIdFromGrant(response: RawGrant["response"]): GrantData | undefined {
	if (!env.GOOGLE_CLIENT_ID) throw new Error("google credentials not set in environment")
	if (!response.profile) return undefined
	const data = response.profile as GoogleUser
	return {
		email: data.email,
		provider: "google",
		id: data.email,
	}
}
