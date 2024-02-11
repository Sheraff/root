import { routerToRoutes, type ApiRouterFromRouter, type marker } from "server/api/helpers"
import * as simpleOpen from "server/api/simpleOpen"
import * as simpleProtected from "server/api/simpleProtected"

const router = {
	hello: simpleOpen,
	protected: simpleProtected,
	nested: {
		foo: simpleOpen,
		bar: simpleProtected,
	},
}

const ApiPlugin = routerToRoutes(router, "/api")
export type ApiRouter = ApiRouterFromRouter<typeof router>
export { marker }
export default ApiPlugin
