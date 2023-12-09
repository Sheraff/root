//@ts-check
/// <reference types="node" />
/* eslint-disable no-undef */

import * as esbuild from "esbuild"
import { spawn } from "node:child_process"
import { join } from "node:path"

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
}

async function build() {
	options.outdir = "../dist/server"
	options.minifySyntax = true
	options.define = {
		"process.env.ROOT": `"${join(process.cwd(), "..")}"`,
	}
	await esbuild.build(options)
}

async function watch() {
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
				build.onEnd(() => {
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
	await context.watch()
	process.on("SIGINT", async () => {
		console.log("Stopping server esbuild...")
		await context.dispose()
		process.exit(0)
	})
}

if (process.argv.includes("--build")) {
	build()
} else {
	watch()
}
