import type { onRequestHookHandler } from "fastify"

const baseOnRequestAuthProtected: onRequestHookHandler = (request, reply, done) => {
	if (!request.session?.user) {
		request.log.warn("/api/protected ::: unauthorized")
		void reply.status(401).send({ error: "unauthorized" })
		return done()
	}
	done()
}

export const onRequestAuthProtected = baseOnRequestAuthProtected as never
