import { type GrantProvider } from "grant"
import { Grant, UserId } from "~/auth"
import { env } from "~/env"

export const options: GrantProvider = {
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

export function getIdFromGrant(response: Grant["response"]): UserId | undefined {
	if (!response.profile) return undefined
	const data = response.profile as GoogleUser
	return {
		email: data.email,
		provider: "google",
		id: data.email,
	}
}
