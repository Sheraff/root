export type Provider = {
	key: string
	name: string
	// icon: string
	color: string
	textColor?: string
}

export const providers: Array<Provider> = [
	{
		key: "google",
		name: "Google",
		// icon: ,
		color: "#DB4437",
		textColor: "#fff",
	},
	{
		key: "spotify",
		name: "Spotify",
		// icon: ,
		color: "#1DB954",
		textColor: "#fff",
	},
	{
		key: "twitch",
		name: "Twitch",
		// icon: ,
		color: "#9146FF",
		textColor: "#fff",
	},
	{
		key: "discord",
		name: "Discord",
		// icon: ,
		color: "#7289DA",
		textColor: "#fff",
	},
]
