import { procedure, define, type BaseSchema } from "server/api/helpers"

const schema = {
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
} as const satisfies BaseSchema

export const definition = define<typeof schema>({
	url: "/api/save",
	method: "post",
})

export const handler = procedure(schema, definition, {
	async handler(request, reply) {
		request.log.info(`Received: ${JSON.stringify(request.body)}`)
		setTimeout(() => {
			void reply.status(200).send({ ok: true })
		}, 1000)
		await reply
	},
})
