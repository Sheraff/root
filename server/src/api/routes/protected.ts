import { procedure, define, type BaseSchema } from "server/api/helpers"
import { authProtected } from "server/auth/helpers/onRequestAuthProtected"

const schema = {
	response: {
		200: {
			type: "object",
			properties: {
				secret: { type: "string" },
			},
			required: ["secret"],
			additionalProperties: false,
		},
		401: authProtected[401],
		404: {
			type: "object",
			properties: {
				what: { type: "string" },
			},
		},
	},
} as const satisfies BaseSchema

export const definition = define<typeof schema>({
	url: "/api/protected",
	method: "get",
})

export const handler = procedure(schema, definition, {
	onRequest: authProtected.onRequest,
	handler(request, reply) {
		void reply.status(200).send({ secret: "🙈" })
	},
})
