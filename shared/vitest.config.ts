import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
// @ts-expect-error -- `shared` package is typed by the main packages, haven't figured out a way to fix this yet
import { ViteRawLoader } from "../scripts/ViteRawLoader.mjs"

export default defineConfig({
	plugins: [viteTsconfigPaths(), ViteRawLoader()],
	envDir: "..",
	test: {
		passWithNoTests: true,
	},
})
