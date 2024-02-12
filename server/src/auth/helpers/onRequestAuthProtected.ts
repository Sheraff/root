import type { onRequestHookHandler } from "fastify"

const baseOnRequestAuthProtected: onRequestHookHandler = (request, reply, done) => {
	if (!request.session?.user) {
		request.log.warn("/api/protected ::: unauthorized")
		return reply.status(401).send({ error: "unauthorized" })
	}
	return done()
}

export const onRequestAuthProtected = baseOnRequestAuthProtected as never

export const authErrorSchema = {
	401: {
		type: "object",
		properties: {
			error: { type: "string" },
		},
		required: ["error"],
		additionalProperties: false,
	},
} as const
