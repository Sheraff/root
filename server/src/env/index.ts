import { parseEnv } from "@shared/env/schema"
import { config } from "dotenv"
config()

export const env = parseEnv(process.env)
