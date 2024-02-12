import { pluginFromRoutes } from "server/api/helpers"
import simpleOpen from "server/api/open"
import simpleProtected from "server/api/protected"

const ApiPlugin = pluginFromRoutes([simpleOpen, simpleProtected])

export default ApiPlugin
