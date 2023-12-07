import { defineConfig } from "vitest/config"
// @ts-expect-error -- `shared` package is typed by the main packages, haven't figured out a way to fix this yet
import ViteSqlLoader from "../scripts/ViteSqlLoader.mjs"

export default defineConfig({
	plugins: [ViteSqlLoader()],
	root: "./shared",
	test: {
		alias: {
			"@shared": "./shared",
		},
		// include: ['**/client/*.{test,spec}.?(c|m)[jt]s?(x)'],
		// exclude: ['**/node_modules/**', '**/build/**'],
		exclude: ["node_modules", "dist", "client", "server"],
		passWithNoTests: true,
		// reporters: process.env.GITHUB_ACTIONS ? ['default', new VitestGHAReporter()] : 'default',
		cache: { dir: "../node_modules/.vitest/shared" },
		outputFile: "../node_modules/.vitest/shared.json",
	},
})
