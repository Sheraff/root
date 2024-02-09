import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"

export const DB_ROOT = path.join(process.cwd(), "db")

console.log(`Using "${DB_ROOT}" folder as the database root.`)

if (!existsSync(DB_ROOT)) {
	mkdirSync(DB_ROOT)
}
