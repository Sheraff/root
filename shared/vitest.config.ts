import { ViteRawLoader } from "script/ViteRawLoader"
import { defineConfig, normalizePath } from "vite"
import VitestGHAReporter from "vitest-github-actions-reporter"

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
		reporters: process.env.GITHUB_ACTIONS ? ["default", new VitestGHAReporter()] : "default",
	},
})
