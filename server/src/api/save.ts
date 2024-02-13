import { procedure, type BaseDefinition, makeClientDefinition } from "server/api/helpers"

const def = {
	url: "/api/save",
	method: "post",
	schema: {
		body: {
			type: "object",
			properties: {
				hello: { type: "string" },
				moo: { type: "number" },
			},
			required: ["hello"],
			additionalProperties: false,
		},
		response: {
			200: {
				type: "object",
				properties: {
					ok: { type: "boolean" },
				},
				required: ["ok"],
				additionalProperties: false,
			},
		},
	},
} as const satisfies BaseDefinition

export const handler = /* @__PURE__ */ procedure(def, {
	async handler(request, reply) {
		request.log.info(`Received: ${JSON.stringify(request.body)}`)
		setTimeout(() => {
			void reply.status(200).send({ ok: true })
		}, 1000)
		await reply
	},
})

export const definition = /* @__PURE__ */ makeClientDefinition(def)
