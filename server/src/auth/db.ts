import Database from "better-sqlite3"
import schemaContent from "./model.sql"
import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"

const dir = path.join(process.cwd(), "db")

if (!existsSync(dir)) {
	mkdirSync(dir)
}

export const authDB = new Database(path.join(dir, "auth.sqlite3"), { verbose: console.log })
authDB.pragma("journal_mode = WAL")
authDB.exec(schemaContent)

process.on("SIGINT", () => {
	console.log("\nClosing authDB...")
	authDB.close()
	process.exit(0)
})
