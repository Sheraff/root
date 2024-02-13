import { procedure, type BaseDefinition, makeClientDefinition } from "server/api/helpers"
import { onRequestAuthProtected, authErrorSchema } from "server/auth/helpers/onRequestAuthProtected"

const def = {
	url: "/api/protected",
	method: "get",
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
			...authErrorSchema,
			404: {
				type: "object",
				properties: {
					what: { type: "string" },
				},
			},
		},
	},
} as const satisfies BaseDefinition

export const handler = /* @__PURE__ */ procedure(def, {
	onRequest: onRequestAuthProtected,
	handler(request, reply) {
		void reply.status(200).send({ secret: "🙈" })
	},
})

export const definition = /* @__PURE__ */ makeClientDefinition(def)
