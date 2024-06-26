import type { FastifyInstance, HTTPMethods, RawServerDefault, RouteOptions } from "fastify"
import type {
	HttpKeys,
	RawReplyDefaultExpression,
	RawRequestDefaultExpression,
} from "fastify/types/utils"
import type { FromSchema } from "json-schema-to-ts"
import type { JSONSchema } from "json-schema-to-ts/lib/types/definitions"
import type { NoInfer, Prettify } from "shared/typeHelpers"

export type BaseSchema = {
	body?: JSONSchema & { type: "object" }
	querystring?: JSONSchema & { type: "object" }
	params?: JSONSchema & { type: "object" }
	headers?: JSONSchema & { type: "object" }
	response?: {
		[key in HttpKeys]?: JSONSchema & { type: "object" | "string" | "array" }
	}
}

export type ClientDefinition = {
	method: HTTPMethods
	url: string
	schema: {
		Body?: Record<string, any>
		Querystring?: Record<string, any>
		Params?: Record<string, any>
		Headers?: Record<string, any>
		Reply?: {
			[Code in HttpKeys]?: Record<string, any> | string
		}
	}
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
		: Schema[Key] extends JSONSchema
			? FromSchema<Schema[Key]>
			: never
}

type RouteDefinition = {
	method: HTTPMethods // | HTTPMethods[]
	url: string
}

/* @__NO_SIDE_EFFECTS__ */
export function define<const Schema extends BaseSchema>(
	definition: RouteDefinition
): {
	readonly method: typeof definition.method
	readonly url: typeof definition.url
	/** This key only exists at the type level, because it's never needed at runtime on the client */
	readonly schema: Prettify<SchemaToRouteGeneric<Schema>>
} {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- return is explicitly typed above
	return {
		method: definition.method,
		url: definition.url,
	} as any
}

/* @__NO_SIDE_EFFECTS__ */
export function procedure<const Schema extends BaseSchema = object>(
	schema: Schema,
	definition: RouteDefinition,
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
	return { schema, ...definition, ...handlers } as RouteOptions
}

type Plugin = (fastify: FastifyInstance, opts: object, done: () => void) => void
/* @__NO_SIDE_EFFECTS__ */
export function pluginFromRoutes(routes: RouteOptions[]): Plugin {
	return function routesPlugin(fastify, opts, done) {
		for (const route of routes) {
			fastify.route(route)
		}
		done()
	}
}
