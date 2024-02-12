import type { FastifyInstance, HTTPMethods, RawServerDefault, RouteOptions } from "fastify"
import type {
	HttpKeys,
	RawReplyDefaultExpression,
	RawRequestDefaultExpression,
} from "fastify/types/utils"
import type { FromSchema } from "json-schema-to-ts"
import type { JSONSchema7 } from "json-schema-to-ts/lib/types/definitions"
import type { NoInfer, Prettify } from "shared/typeHelpers"

type BaseSchema = {
	body?: JSONSchema7 & { type: "object" }
	querystring?: JSONSchema7 & { type: "object" }
	params?: JSONSchema7 & { type: "object" }
	headers?: JSONSchema7 & { type: "object" }
	response?: {
		[key in HttpKeys]?: JSONSchema7 & { type: "object" }
	}
}

export type BaseDefinition<Schema extends BaseSchema = BaseSchema> = {
	method: HTTPMethods // | HTTPMethods[]
	url: string
	schema: Schema
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
			[Code in HttpKeys]?: Record<string, any>
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
		: Schema[Key] extends JSONSchema7
			? FromSchema<Schema[Key]>
			: never
}

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

type DefinitionToClientType<Def extends BaseDefinition> = Omit<Def, "schema"> & {
	/** This key only exists at the type level, because it's never needed at runtime on the client */
	readonly schema: Prettify<SchemaToRouteGeneric<Def["schema"]>>
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

export function makeClientDefinition<Def extends BaseDefinition>(
	definition: Def
): Prettify<DefinitionToClientType<Def>> {
	return {
		method: definition.method,
		url: definition.url,
	} as DefinitionToClientType<Def>
}
