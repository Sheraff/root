import { ViteRawLoader } from "scripts/ViteRawLoader"
import { normalizePath } from "vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [ViteRawLoader()],
	envDir: "..",
	resolve: {
		alias: {
			// use alias to avoid having "client" as a package dependency of "client"
			"client/": `${normalizePath(__dirname)}/src/`,
		}
	},
	test: {
		passWithNoTests: true,
		alias: [
			{ find: /^(.*)\.txt$/, replacement: "$1.txt?raw" },
			{ find: /^(.*)\.sql$/, replacement: "$1.sql?raw" },
		],
	},
})
