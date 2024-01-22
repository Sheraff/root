/* eslint-disable no-undef */

import * as esbuild from "esbuild"
import { type ChildProcess, spawn } from "node:child_process"
import { join } from "node:path"
import { cp } from "node:fs/promises"
import { watch as chokidar } from "chokidar"

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
	await cp("../assets/src", "../dist/schemas", { recursive: true })
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
					await cp("../assets/src", "node_modules/.cache/schemas", { recursive: true })
					process.env.ROOT = join(process.cwd(), "..")
					const run = () =>
						spawn(
							"node",
							["--env-file=../.env", "--enable-source-maps", "node_modules/.cache/server/app.mjs"],
							{ stdio: "inherit", env: process.env },
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

async function makeChokidarWatcher() {
	const watcher = chokidar("../assets/src", {
		ignoreInitial: true,
		persistent: true,
		atomic: true,
		awaitWriteFinish: {
			stabilityThreshold: 50,
		},
	})
	await new Promise((resolve) => watcher.once("ready", resolve))
	return watcher
}

async function watch() {
	const [context, watcher] = await Promise.all([makeEsbuildWatcher(), makeChokidarWatcher()])
	let debounce: NodeJS.Timeout | null = null
	watcher.on("all", (event, path) => {
		if (debounce) clearTimeout(debounce)
		console.log(`File ${path} modified (${event}), rebuilding server esbuild...`)
		debounce = setTimeout(() => {
			debounce = null
			context.rebuild()
		}, 100)
	})
	await context.watch()
	process.on("SIGINT", async () => {
		console.log("Stopping server esbuild...")
		await Promise.all([context.dispose(), watcher.close()])
		process.exit(0)
	})
}

if (process.argv.includes("--build")) {
	build()
} else {
	watch()
}
