import { procedure } from "server/api/helpers"
import { onRequestAuthProtected } from "server/auth/helpers/onRequestAuthProtected"

export const get = procedure({
	onRequest: onRequestAuthProtected,
	handler(request) {
		request.log.info("hello protected world")
		return { secret: "🙈 secret" }
	},
	schema: {
		response: {
			200: {
				type: "object",
				properties: {
					secret: { type: "string" },
				},
				required: ["secret"],
				additionalProperties: false,
			},
		},
	},
})
