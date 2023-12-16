//@ts-check
/// <reference types="node" />
/* eslint-disable no-undef */

import * as esbuild from "esbuild"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { loadEnv } from "vite"

/** @type {import("esbuild").BuildOptions} */
const options = {
	entryPoints: ["src/index.ts"],
	bundle: true,
	sourcemap: true,
	keepNames: true,
	format: "esm",
	loader: {
		".sql": "text",
		".html": "text",
	},
	// alias: {
	// 	shared: "../shared",
	// },
}

/** @type {import('esbuild').Plugin} */
const injectViteHtml = {
	name: "source-vite-index",
	setup(build) {
		build.onResolve({ filter: /index\.html$/ }, (args) => {
			const requested = join(args.resolveDir, args.path)
			const target = join(process.cwd(), "../client/index.html")
			if (requested !== target) return
			return { path: "../dist/client/index.html", namespace: "source-vite-index" }
		})
		build.onLoad({ filter: /.*/, namespace: "source-vite-index" }, async (args) => {
			const path = join(process.cwd(), args.path)
			const html = await readFile(path, "utf8")
			return { contents: html, loader: "text" }
		})
	},
}

async function build() {
	options.outfile = "../dist/sw/sw.js"
	options.minifySyntax = true
	options.plugins = [injectViteHtml]
	const env = loadEnv("production", "..")
	options.define = Object.fromEntries(
		Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
	)
	options.define["import.meta.env.MODE"] = "'production'"
	options.define["import.meta.env.DEV"] = "false"
	options.define["import.meta.env.PROD"] = "true"
	options.define["import.meta.env.SSR"] = "false"
	options.inject
	await esbuild.build(options)
}

async function watch() {
	options.outfile = "../client/public/sw.js"
	const env = loadEnv("development", "..")
	options.define = Object.fromEntries(
		Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
	)
	options.define["import.meta.env.MODE"] = "'production'"
	options.define["import.meta.env.DEV"] = "true"
	options.define["import.meta.env.PROD"] = "false"
	options.define["import.meta.env.SSR"] = "false"
	const context = await esbuild.context(options)
	await context.watch()
	process.on("SIGINT", async () => {
		console.log("Stopping SW esbuild...")
		await context.dispose()
		process.exit(0)
	})
}

if (process.argv.includes("--build")) {
	build()
} else {
	watch()
}
