import {
	type ContextConfigDefault,
	type FastifyInstance,
	type FastifySchema,
	type RawReplyDefaultExpression,
	type RawRequestDefaultExpression,
	type RawServerDefault,
	type RouteGenericInterface,
	type RouteOptions,
} from "fastify"
import { type FromSchema } from "json-schema-to-ts"
import type { JSONSchema7 } from "json-schema-to-ts/lib/types/definitions"

type MethodDefinition<
	SchemaCompiler extends FastifySchema = FastifySchema,
	RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
	ContextConfig = ContextConfigDefault,
> = Omit<
	RouteOptions<
		RawServerDefault,
		RawRequestDefaultExpression,
		RawReplyDefaultExpression,
		RouteGeneric,
		ContextConfig,
		SchemaCompiler
	>,
	"method" | "url"
>

export function makeMethod<
	const SchemaCompiler extends FastifySchema = FastifySchema,
	RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
	D extends MethodDefinition<SchemaCompiler, RouteGeneric> = MethodDefinition<
		SchemaCompiler,
		RouteGeneric
	>,
>(definition: D): D {
	return definition
}

type Method = "get" | "post" | "put" | "delete" | "patch" | "head" | "options"

type RouteDefinition = {
	get?: MethodDefinition
	head?: MethodDefinition
	post?: MethodDefinition
	put?: MethodDefinition
	delete?: MethodDefinition
	options?: MethodDefinition
	patch?: MethodDefinition
}

type SchemaKey = "body" | "querystring" | "params" | "headers" | "response"
export type ApiRouterFromRouter<R extends object> = {
	[Route in keyof R]: {
		[Method in keyof R[Route]]: R[Route][Method] extends {
			schema?: infer Schema extends BaseSchema
		}
			? SchemaToType<Schema>
			: never
	}
}

type BaseSchema = {
	body?: JSONSchema7
	querystring?: JSONSchema7
	params?: JSONSchema7
	headers?: JSONSchema7
	response?: Record<number, JSONSchema7>
}

type SchemaToType<S extends BaseSchema> = {
	[Key in SchemaKey]?: Key extends "response"
		? S[Key] extends { 200: infer R extends JSONSchema7 }
			? FromSchema<R>
			: never
		: S[Key] extends JSONSchema7
			? FromSchema<S[Key]>
			: never
}

type Plugin = (fastify: FastifyInstance, opts: object, done: () => void) => void

export function routerToRoutes(router: Record<string, RouteDefinition>): Plugin {
	return function routes(fastify, opts, done) {
		for (const [url, definition] of Object.entries(router)) {
			for (const [method, methodDefinition] of Object.entries(definition) as [
				Method,
				MethodDefinition,
			][]) {
				fastify[method](url, methodDefinition)
			}
		}
		done()
	}
}
