import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { ViteRawLoader } from "scripts/ViteRawLoader"
// import { fileURLToPath } from "url"
// import { readFileSync } from "fs"

// const envs = Object.fromEntries(
// 	readFileSync(fileURLToPath(new URL("../.env", import.meta.url)), "utf8")
// 		.split("\n")
// 		.filter((l) => l.trim() && !l.startsWith("#"))
// 		.sort()
// 		.map((l) => l.split("=", 2)),
// )

export default defineConfig({
	plugins: [viteTsconfigPaths(), ViteRawLoader()],
	envDir: "..",
	test: {
		passWithNoTests: true,
		// env: envs,
	},
})
