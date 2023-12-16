import { parseServerEnv } from "shared/env/schema"
import { config } from "dotenv"
config({ path: "../.env" })

export const env = parseServerEnv(process.env)
