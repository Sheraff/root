//@ts-check
/// <reference types="node" />
/* eslint-disable no-undef */

import * as esbuild from "esbuild"
import { spawn } from "node:child_process"
import { join } from "node:path"
import { cp } from "node:fs/promises"
import { watch as chokidar } from "chokidar"
import { rm } from "node:fs/promises"

/** @type {import("esbuild").BuildOptions} */
const options = {
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
	alias: {
		shared: "../shared",
	},
}

async function build() {
	options.outdir = "../dist/server"
	options.minifySyntax = true
	options.define = {
		"process.env.ROOT": `"${join(process.cwd(), "..")}"`,
	}
	await rm("../dist/client/sw.js", { force: true })
	await rm("../dist/client/sw.js.map", { force: true })
	await esbuild.build(options)
	await cp("../shared/schemas", "../dist/schemas", { recursive: true })
}

async function makeEsbuildWatcher() {
	options.outdir = "node_modules/.cache/server"
	options.plugins = [
		{
			name: "watch-exec",
			setup(build) {
				/** @type {import('child_process').ChildProcess|null} */
				let childProcess = null
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
					await cp("../shared/schemas", "node_modules/.cache/schemas", { recursive: true })
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
	const watcher = chokidar("../shared/schemas", {
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
	/** @type {NodeJS.Timeout | null} */
	let debounce = null
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
