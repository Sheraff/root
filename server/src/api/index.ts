import { pluginFromRoutes } from "server/api/helpers"
import { handler as simpleOpen } from "server/api/open"
import { handler as simpleProtected } from "server/api/protected"
import { handler as simpleSave } from "server/api/save"

const ApiPlugin = pluginFromRoutes([simpleOpen, simpleProtected, simpleSave])

export default ApiPlugin
