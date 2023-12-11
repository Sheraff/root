import { parseEnv } from "shared/env/schema"
import { config } from "dotenv"
config({ path: "../.env" })

export const env = parseEnv(process.env)
