import { makeMethod } from "server/api/helpers"

export const get = makeMethod({
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
				name: { type: "string" },
			},
			required: ["name"],
			additionalProperties: false,
		},
	},
})
