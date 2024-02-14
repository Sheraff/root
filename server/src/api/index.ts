import { pluginFromRoutes } from "server/api/helpers"
import { handler as simpleOpen } from "server/api/routes/open"
import { handler as simpleProtected } from "server/api/routes/protected"
import { handler as simpleSave } from "server/api/routes/save"
import { handler as accounts } from "server/api/routes/accounts"

const ApiPlugin = pluginFromRoutes([simpleOpen, simpleProtected, simpleSave, accounts])

export default ApiPlugin
