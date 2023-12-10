import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"

const projectRoot = process.env.ROOT

if (!projectRoot) {
	throw new Error("ROOT environment variable not set.")
}

export const DB_ROOT = path.join(projectRoot, "db")

if (!existsSync(DB_ROOT)) {
	mkdirSync(DB_ROOT)
}
