/* eslint-disable no-undef */

import * as esbuild from "esbuild"
import { type ChildProcess, spawn } from "node:child_process"
import { join } from "node:path"
import fastify from "fastify"
import proxy from "@fastify/http-proxy"
import { env } from "@repo/server/env"

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
	// 	"@repo/shared": "../shared/src",
	// 	"@repo/script": "../script/src",
	// 	"@repo/assets": "../assets/src",
	// 	"@repo/worker": "../worker/src",
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

type Status = {
	flag: boolean
}

async function makeEsbuildWatcher() {
	const status: Status = {
		flag: true,
	}
	options.outdir = "node_modules/.cache/server"
	options.plugins = [
		{
			name: "watch-exec",
			setup(build) {
				let childProcess: ChildProcess | null = null
				build.onStart(() => {
					status.flag = false
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
	return { context, status }
}

async function watch() {
	const { context, status } = await makeEsbuildWatcher()
	await context.watch()
	const kill = () => context.dispose()
	return { status, kill }
}

async function proxyDevServer(status: Status) {
	const server = fastify()

	let polling: Promise<void> | null = null
	async function healthPoll() {
		console.log("Stalling requests, waiting for server to restart...")
		while (true) {
			try {
				const res = await fetch("http://localhost:8877/health", { method: "HEAD" })
				if (res.status === 200) {
					status.flag = true
					polling = null
					console.log("Server restarted, resuming requests.")
					return
				}
			} catch {}
			if (polling === null) return
			await new Promise((resolve) => setTimeout(resolve, 10))
		}
	}

	server.register(proxy, {
		upstream: "http://localhost:8877",
		logLevel: "silent",
		preHandler: async (req) => {
			if (status.flag) {
				return
			}
			if (!polling) polling = healthPoll()
			console.log(`Stalled request: ${req.url}`)
			await polling
			console.log(`Resume request: ${req.url}`)
		},
	})

	server.listen({ port: env.DEV_PROXY_SERVER_PORT ?? 8123 })

	const kill = () => {
		polling = null
		return server.close()
	}

	return { kill }
}

if (process.argv.includes("--build")) {
	await build()
} else {
	const { status, kill: killWatcher } = await watch()
	const { kill: killProxy } = await proxyDevServer(status)

	process.on("SIGINT", async () => {
		console.log("Stopping server esbuild...")
		Promise.all([killWatcher(), killProxy()])
		process.exit(0)
	})
}
