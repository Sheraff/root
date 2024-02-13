import { procedure, type BaseDefinition, makeClientDefinition } from "server/api/helpers"
import { onRequestAuthProtected, authErrorSchema } from "server/auth/helpers/onRequestAuthProtected"
import { sql } from "shared/sql"

const def = {
	url: "/api/accounts",
	method: "get",
	schema: {
		response: {
			200: {
				type: "object",
				properties: {
					accounts: {
						type: "array",
						items: {
							type: "string",
						},
					},
				},
				required: ["accounts"],
				additionalProperties: false,
			},
			...authErrorSchema,
		},
	},
} as const satisfies BaseDefinition

export const handler = /* @__PURE__ */ procedure(def, {
	onRequest: onRequestAuthProtected,
	handler(request, reply) {
		const user = request.session.user!
		const statement = request.server.auth.db.prepare<{ userId: string }>(
			sql`SELECT provider from accounts WHERE user_id = @userId`
		)
		const providers = statement.all({ userId: user.id }) as Array<{ provider: string }>
		void reply.status(200).send({ accounts: providers.map((p) => p.provider) })
	},
})

export const definition = /* @__PURE__ */ makeClientDefinition(def)
