import { ViteRawLoader } from "script/ViteRawLoader"
import { normalizePath } from "vite"
import { defineConfig } from "vitest/config"
import VitestGHAReporter from "vitest-github-actions-reporter"

export default defineConfig({
	plugins: [ViteRawLoader()],
	envDir: "..",
	resolve: {
		alias: {
			// use alias to avoid having "server" as a package dependency of "server"
			"server/": `${normalizePath(__dirname)}/src/`,
		},
	},
	test: {
		passWithNoTests: true,
		setupFiles: ["./vitest.setup.ts"],
		includeSource: ["src/**/*.{js,ts}"],
		alias: [
			{ find: /^(.*)\.txt$/, replacement: "$1.txt?raw" },
			// { find: /^(.*)\.sql$/, replacement: "$1.sql?raw" },
		],
		reporters: process.env.GITHUB_ACTIONS ? ["default", new VitestGHAReporter()] : "default",
	},
	// esbuild: {},
})
