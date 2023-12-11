import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { ViteRawLoader } from "scripts/ViteRawLoader"

export default defineConfig({
	plugins: [viteTsconfigPaths(), ViteRawLoader()],
	envDir: "..",
	test: {
		passWithNoTests: true,
		// alias: {
		// 	"@scripts": "node_modules/@scripts",
		// },
	},
})
