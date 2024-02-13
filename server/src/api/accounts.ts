import { procedure, define, type BaseSchema } from "server/api/helpers"
import { authProtected } from "server/auth/helpers/onRequestAuthProtected"
import { sql } from "shared/sql"

const schema = {
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
		401: authProtected[401],
	},
} as const satisfies BaseSchema

export const definition = define<typeof schema>({
	url: "/api/accounts",
	method: "get",
})

export const handler = /* @__PURE__ */ procedure(schema, definition, {
	onRequest: authProtected.onRequest,
	handler(request, reply) {
		const user = request.session.user!
		const statement = request.server.auth.db.prepare<{ userId: string }>(
			sql`SELECT provider from accounts WHERE user_id = @userId`
		)
		const providers = statement.all({ userId: user.id }) as Array<{ provider: string }>
		void reply.status(200).send({ accounts: providers.map((p) => p.provider) })
	},
})
