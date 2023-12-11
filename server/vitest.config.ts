import { ViteRawLoader } from "scripts/ViteRawLoader"
import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [viteTsconfigPaths(), ViteRawLoader()],
	envDir: "..",
	test: {
		passWithNoTests: true,
		// reporters: process.env.GITHUB_ACTIONS ? ['default', new VitestGHAReporter()] : 'default',
	},
})
