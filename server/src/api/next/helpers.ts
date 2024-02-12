import type { FastifyInstance, HTTPMethods, RawServerDefault, RouteOptions } from "fastify"
import type {
	HttpKeys,
	RawReplyDefaultExpression,
	RawRequestDefaultExpression,
} from "fastify/types/utils"
import type { FromSchema } from "json-schema-to-ts"
import type { JSONSchema7 } from "json-schema-to-ts/lib/types/definitions"

type BaseSchema = {
	body?: JSONSchema7
	querystring?: JSONSchema7
	params?: JSONSchema7
	headers?: JSONSchema7
	response?: {
		[key in HttpKeys]?: JSONSchema7
	}
}

export type BaseDefinition<Schema extends BaseSchema = BaseSchema> = {
	method: HTTPMethods // | HTTPMethods[]
	url: string
	schema: Schema
}

type SchemaKeyMap = {
	body: "Body"
	querystring: "Querystring"
	params: "Params"
	headers: "Headers"
	response: "Reply"
}

type SchemaToRouteGeneric<Schema extends BaseSchema> = {
	[Key in keyof Schema & keyof SchemaKeyMap as SchemaKeyMap[Key]]: Key extends "response"
		? Schema[Key] extends object
			? {
					[Code in keyof Schema[Key] & HttpKeys]: Schema[Key][Code] extends object
						? FromSchema<Schema[Key][Code]>
						: never
				}
			: never
		: Schema[Key] extends JSONSchema7
			? FromSchema<Schema[Key]>
			: never
}

type NoInfer<T> = [T][T extends any ? 0 : never]

export function procedure<const Schema extends BaseSchema = object>(
	definition: BaseDefinition<Schema>,
	handlers: Omit<
		RouteOptions<
			RawServerDefault,
			RawRequestDefaultExpression,
			RawReplyDefaultExpression,
			NoInfer<SchemaToRouteGeneric<Schema>>
		>,
		"method" | "url" | "schema"
	>
): RouteOptions {
	return { ...definition, ...handlers } as RouteOptions
}

export type DefinitionToClientType<Def extends BaseDefinition> = Omit<Def, "schema"> & {
	schema: SchemaToRouteGeneric<Def["schema"]>
}

type Plugin = (fastify: FastifyInstance, opts: object, done: () => void) => void
export function pluginFromRoutes(routes: RouteOptions[]): Plugin {
	return function routesPlugin(fastify, opts, done) {
		for (const route of routes) {
			fastify.route(route)
		}
		done()
	}
}
