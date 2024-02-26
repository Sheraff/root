import { type GrantProvider } from "grant"
import { number, object, parse, string } from "valibot"
import { type GrantData, type RawGrant } from "server/auth/providers"
import { env } from "server/env"

export const options: GrantProvider | undefined = !env.GITHUB_CLIENT_ID
	? undefined
	: {
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			scope: ["read:user", "user:email"],
			response: ["tokens", "profile"],
			nonce: true,
		}

// type GithubUser = {
// 	access_token: string
// 	refresh_token: string
// 	profile: {
// 		login: string
// 		id: number
// 		node_id: string
// 		avatar_url: string
// 		gravatar_id: string
// 		url: string
// 		html_url: string
// 		followers_url: string
// 		following_url: string
// 		gists_url: string
// 		starred_url: string
// 		subscriptions_url: string
// 		organizations_url: string
// 		repos_url: string
// 		events_url: string
// 		received_events_url: string
// 		type: string
// 		site_admin: boolean
// 		name: string
// 		company: null
// 		blog: string
// 		location: string
// 		email: string
// 		hireable: null
// 		bio: string
// 		twitter_username: null
// 		public_repos: number
// 		public_gists: number
// 		followers: number
// 		following: number
// 		created_at: string
// 		updated_at: string
// 	}
// }

const githubUserShape = object({
	id: number(),
	email: string(),
})

export function getIdFromGrant(response: RawGrant["response"]): GrantData | undefined {
	if (!env.GITHUB_CLIENT_ID) throw new Error("Github credentials not set in environment")
	if (!response.profile) return undefined
	const data = parse(githubUserShape, response.profile)
	return {
		email: data.email,
		provider: "github",
		id: String(data.id),
	}
}
