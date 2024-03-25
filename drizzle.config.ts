import { defineConfig } from "drizzle-kit"

export default defineConfig({
	schema: "./shared/src/drizzle-test/schema.ts",
	driver: "better-sqlite",
	out: "./shared/src/drizzle-migrations",
	verbose: true,
	strict: true,
})
