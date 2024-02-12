import { pluginFromRoutes } from "server/api/next/helpers"
import simpleOpen from "server/api/next/open"

const ApiPlugin = pluginFromRoutes([simpleOpen])

export default ApiPlugin
