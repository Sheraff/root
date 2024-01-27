import { ViteRawLoader } from "scripts/ViteRawLoader"
import { defineConfig, normalizePath } from "vite"

export default defineConfig({
	plugins: [ViteRawLoader()],
	envDir: "..",
	resolve: {
		alias: {
			// use alias to avoid having "shared" as a package dependency of "shared"
			"shared/": `${normalizePath(__dirname)}/src/`,
		},
	},
	test: {
		passWithNoTests: true,
		alias: [
			{ find: /^(.*)\.txt$/, replacement: "$1.txt?raw" },
			{ find: /^(.*)\.sql$/, replacement: "$1.sql?raw" },
		],
	},
})
