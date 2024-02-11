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
	},
})
