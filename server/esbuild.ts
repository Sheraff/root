/* eslint-disable no-undef */

import * as esbuild from "esbuild"
import { type ChildProcess, spawn } from "node:child_process"
import { join } from "node:path"

const options: esbuild.BuildOptions = {
	entryPoints: ["src/app.ts"],
	platform: "node",
	target: "node20",
	format: "esm",
	allowOverwrite: true,
	packages: "external",
	keepNames: true,
	bundle: true,
	sourcemap: true,
	loader: {
		".sql": "text",
	},
	outExtension: {
		".js": ".mjs",
	},
	// alias: {
	// 	"shared": "../shared/src",
	// 	"scripts": "../scripts/src",
	// 	"assets": "../assets/src",
	// 	"sw": "../sw/src",
	// },
}

async function build() {
	options.outdir = "../dist/server"
	options.minifySyntax = true
	options.define = {
		"process.env.ROOT": `"${join(process.cwd(), "..")}"`,
		"import.meta.vitest": "undefined",
	}
	await esbuild.build(options)
}

async function makeEsbuildWatcher() {
	options.outdir = "node_modules/.cache/server"
	options.plugins = [
		{
			name: "watch-exec",
			setup(build) {
				let childProcess: ChildProcess | null = null
				build.onStart(() => {
					if (childProcess) {
						const running = childProcess
						running.kill("SIGINT")
						running.on("exit", () => {
							console.log("Previous server process exited.")
							if (childProcess === running) childProcess = null
						})
					}
				})
				build.onEnd(async () => {
					process.env.ROOT = join(process.cwd(), "..")
					const run = () =>
						spawn(
							"node",
							[
								"--env-file=../.env",
								"--enable-source-maps",
								"node_modules/.cache/server/app.mjs",
							],
							{ stdio: "inherit", env: process.env }
						)
					if (childProcess) {
						childProcess.on("exit", () => (childProcess = run()))
					} else {
						childProcess = run()
					}
				})
			},
		},
	]
	const context = await esbuild.context(options)
	return context
}

async function watch() {
	const context = await makeEsbuildWatcher()
	await context.watch()
	process.on("SIGINT", async () => {
		console.log("Stopping server esbuild...")
		context.dispose()
		process.exit(0)
	})
}

if (process.argv.includes("--build")) {
	build()
} else {
	watch()
}
