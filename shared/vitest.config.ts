import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
// @ts-expect-error -- why??
import { ViteRawLoader } from "../scripts/ViteRawLoader.mjs"

export default defineConfig({
	plugins: [viteTsconfigPaths(), ViteRawLoader()],
	envDir: "..",
	test: {
		passWithNoTests: true,
	},
})
