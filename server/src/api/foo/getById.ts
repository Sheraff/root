import { type RouteHandlerMethod, type FastifyInstance } from "fastify"
import { number, object, string, type Output, parse, never, type BaseSchema } from "valibot"

const input = object({ id: string() })

const output = object({ id: string(), name: string(), count: number() })

type KeyToParams<Key extends string[]> = {
	[Param in Key[number] as Param extends `:${infer P extends string}` ? P : never]: string
}

function routeDefinition<
	const R extends {
		input: BaseSchema
		output: BaseSchema
		key: string[]
		handler: RouteHandlerMethod
	},
>(route: R): R {
	return route
}

const ROUTE = routeDefinition({
	input: never(),
	output: object({ id: string(), name: string(), count: number() }),
	key: ["api", "foo", ":id"],
	handler(request, reply) {},
})

const a = ROUTE.key

export default function routes(fastify: FastifyInstance, opts: object, done: () => void) {
	fastify.get<{
		Params: KeyToParams<(typeof ROUTE)["key"]>
	}>("/api/foo/:id", (request, reply) => {
		const params = parse(input, request.params)
		const data = {}

		return parse(output, data)
	})
}
