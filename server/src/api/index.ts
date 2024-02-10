import { routerToRoutes, type ApiRouterFromRouter } from "server/api/helpers"
import * as simpleOpen from "server/api/simpleOpen"
import * as simpleProtected from "server/api/simpleProtected"

const router = {
	"/api/hello": simpleOpen,
	"/api/protected": simpleProtected,
}

const ApiPlugin = routerToRoutes(router)
export type ApiRouter = ApiRouterFromRouter<typeof router>
export default ApiPlugin
