import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { ViteRawLoader } from "../scripts/ViteRawLoader.mjs"

export default defineConfig({
	plugins: [
		viteTsconfigPaths({
			projects: ["./tsconfig.json"],
		}),
		ViteRawLoader(),
	],
	envDir: "..",
	root: "./server",
	test: {
		exclude: ["node_modules", "dist", "client"],
		passWithNoTests: true,
		// reporters: process.env.GITHUB_ACTIONS ? ['default', new VitestGHAReporter()] : 'default',
		cache: { dir: "../node_modules/.vitest/server" },
		outputFile: "../node_modules/.vitest/server.json",
	},
})
