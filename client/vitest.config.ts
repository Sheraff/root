import viteTsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"
import { ViteRawLoader } from "scripts/ViteRawLoader"

export default defineConfig({
	plugins: [viteTsconfigPaths(), ViteRawLoader()],
	envDir: "..",
	test: {
		passWithNoTests: true,
		alias: [
			{ find: /^(.*)\.txt$/, replacement: "$1.txt?raw" },
			{ find: /^(.*)\.sql$/, replacement: "$1.sql?raw" },
		],
	},
})
