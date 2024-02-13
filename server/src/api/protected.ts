import { procedure, define, type BaseSchema } from "server/api/helpers"
import { onRequestAuthProtected, authErrorSchema } from "server/auth/helpers/onRequestAuthProtected"

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
		...authErrorSchema,
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

export const handler = /* @__PURE__ */ procedure(schema, definition, {
	onRequest: onRequestAuthProtected,
	handler(request, reply) {
		void reply.status(200).send({ secret: "🙈" })
	},
})
