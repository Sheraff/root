import { procedure } from "server/api/helpers"

/** @public api */
export const get = procedure({
	handler(request) {
		request.log.info("hello world")
		return { hello: "world" }
	},
	schema: {
		response: {
			200: {
				type: "object",
				properties: {
					hello: { type: "string" },
				},
				required: ["hello"],
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
	},
})
