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

export const marker = Symbol("procedure")

export function procedure<
	const SchemaCompiler extends FastifySchema = FastifySchema,
	RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
	D extends MethodDefinition<SchemaCompiler, RouteGeneric> = MethodDefinition<
		SchemaCompiler,
		RouteGeneric
	>,
>(definition: D): D & { [marker]: true } {
	return Object.assign(definition, { [marker]: true } as const)
}

type SchemaKey = "body" | "querystring" | "params" | "headers" | "response"
type BaseSchema = {
	body?: JSONSchema7
	querystring?: JSONSchema7
	params?: never // this is not compatible with our proxy
	headers?: JSONSchema7
	response?: Record<number, JSONSchema7>
}
type SchemaToType<S extends BaseSchema> = {
	[Key in SchemaKey & keyof S]: Key extends "response"
		? S[Key] extends { 200: infer R extends JSONSchema7 }
			? FromSchema<R>
			: never
		: S[Key] extends JSONSchema7
			? FromSchema<S[Key]>
			: never
}
export type ApiRouterFromRouter<R extends object> = {
	[Route in keyof R]: R[Route] extends { [marker]: true }
		? R[Route] extends { schema?: infer Schema extends BaseSchema }
			? SchemaToType<Schema> & { [marker]: true }
			: never
		: R[Route] extends object
			? ApiRouterFromRouter<R[Route]>
			: never
}

type Plugin = (fastify: FastifyInstance, opts: object, done: () => void) => void
type RouteDefinition = {
	get?: MethodDefinition & { [marker]: true }
	head?: MethodDefinition & { [marker]: true }
	post?: MethodDefinition & { [marker]: true }
	put?: MethodDefinition & { [marker]: true }
	delete?: MethodDefinition & { [marker]: true }
	options?: MethodDefinition & { [marker]: true }
	patch?: MethodDefinition & { [marker]: true }
}
type Method = "get" | "post" | "put" | "delete" | "patch" | "head" | "options"
interface Router {
	[part: string]: RouteDefinition | Router
}
export function routerToRoutes(router: Router, prefix = "/"): Plugin {
	return function routes(fastify, opts, done) {
		function define(r: Router | RouteDefinition, url = prefix) {
			const entries = Object.entries(r) as Array<
				[Method, MethodDefinition] | [string, Router]
			>
			for (const entry of entries) {
				if (marker in entry[1]) {
					const [method, methodDefinition] = entry as [Method, MethodDefinition]
					fastify[method](url, methodDefinition)
				} else {
					const [part, router] = entry as [string, Router]
					define(router, url + "/" + part)
				}
			}
		}
		define(router)
		done()
	}
}
