import { procedure, define, type BaseSchema } from "server/api/helpers"

const schema = {
	response: {
		200: {
			type: "object",
			properties: {
				hello: { type: "string" },
			},
			required: ["hello"],
			additionalProperties: false,
		},
		201: {
			type: "object",
			properties: {
				michel: { type: "number" },
			},
			required: ["michel"],
		},
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
			},
			required: ["error"],
			additionalProperties: false,
		},
	},
	querystring: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
		additionalProperties: false,
	},
	headers: {
		type: "object",
		properties: {
			"x-id": { type: "string" },
		},
		required: ["x-id"],
		additionalProperties: false,
	},
} as const satisfies BaseSchema

export const definition = define<typeof schema>({
	url: "/api/hello",
	method: "get",
})

export const handler = procedure(schema, definition, {
	handler(request, reply) {
		request.log.info("hello world", request.query.id, request.headers["x-id"])
		if (request.query.id === "42") {
			void reply.code(200).send({ hello: "world" })
			// void reply.status(200).send({ hello: "world" })
		} else {
			void reply.code(404).send({ error: "no" })
		}
	},
})