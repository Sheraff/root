//@ts-check
/// <reference types="node" />
/* eslint-disable no-undef */

import * as esbuild from "esbuild"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

/** @type {import("esbuild").BuildOptions} */
const options = {
	entryPoints: ["src/index.ts"],
	bundle: true,
	sourcemap: true,
	keepNames: true,
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
	await esbuild.build(options)
}

async function watch() {
	options.outfile = "../client/public/sw.js"
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
