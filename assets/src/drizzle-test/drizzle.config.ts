import { defineConfig } from "drizzle-kit"
import { relative, resolve } from "node:path"

const schema = relative(".", resolve(__dirname, "schema.ts"))
const out = relative(".", resolve(__dirname, "migrations"))

export default defineConfig({
	schema,
	driver: "better-sqlite",
	out,
	verbose: true,
	strict: true,
})
