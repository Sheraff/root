/* eslint-disable no-undef */

import { compressBuffer } from "script/compressBuffer"
import * as esbuild from "esbuild"
import { readFile, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { loadEnv } from "vite"
import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"

const options: esbuild.BuildOptions = {
	entryPoints: ["src/index.ts"],
	bundle: true,
	sourcemap: true,
	keepNames: true,
	format: "esm",
	loader: {
		".sql": "text",
		".html": "text",
	},
	tsconfig: "./tsconfig.app.json",
	// alias: {
	// 	"shared": "../shared/src",
	// 	"script": "../script/src",
	// 	"assets": "../assets/src",
	// 	"worker": "../worker/src",
	// },
}

const injectViteHtml: esbuild.Plugin = {
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

const logger: esbuild.Plugin = {
	name: "logger",
	setup(build) {
		build.onStart(() => {
			console.log("Building SW...")
		})
		build.onEnd(() => {
			console.log("Rebuilt SW")
		})
	},
}

/** @param {string} relative */
async function compressFile(relative: string) {
	const path = join(process.cwd(), relative)
	const buffer = await readFile(path)
	if (buffer.byteLength < 1501) return
	/** @type {Buffer} */
	const compressed = await compressBuffer(buffer)
	return writeFile(path + ".br", compressed)
}

async function build() {
	options.outfile = "../dist/worker/sw.js"
	options.minifySyntax = true
	options.plugins = [injectViteHtml]

	// env
	const env = loadEnv("production", "..")
	options.define = Object.fromEntries(
		Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
	)
	options.define["import.meta.env.MODE"] = "'production'"
	options.define["import.meta.env.DEV"] = "false"
	options.define["import.meta.env.PROD"] = "true"
	options.define["import.meta.env.SSR"] = "false"

	// assets
	const outDir = join(process.cwd(), "../dist/client")
	const buildInclude = /\.(js|css|wasm)$/
	const buildFiles = readdir(join(outDir, "assets")).then((files) =>
		files.filter((f) => buildInclude.test(f)).map((f) => `/assets/${f}`)
	)
	const staticExclude = ["index.html"]
	const staticFiles = readdir(outDir, { withFileTypes: true }).then((files) =>
		files.filter((f) => f.isFile() && !staticExclude.includes(f.name)).map((f) => `/${f.name}`)
	)
	const files = await Promise.all(["/", buildFiles, staticFiles])
	options.define["__CLIENT_ASSETS__"] = JSON.stringify(files.flat())

	// cache versioning
	const hash = createHash("sha256")
	for (let file of files.flat()) {
		file = file === "/" ? "index.html" : file
		createReadStream(join(outDir, file)).pipe(hash)
	}
	options.define["__CLIENT_ASSETS_HASH__"] = JSON.stringify(hash.digest("hex"))

	//
	await esbuild.build(options)
	await compressFile("../dist/worker/sw.js")
}

async function watch() {
	options.outfile = "../client/public/sw.js"

	// env
	const env = loadEnv("development", "..")
	options.define = Object.fromEntries(
		Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
	)
	options.define["import.meta.env.MODE"] = "'production'"
	options.define["import.meta.env.DEV"] = "true"
	options.define["import.meta.env.PROD"] = "false"
	options.define["import.meta.env.SSR"] = "false"

	// assets
	options.define["__CLIENT_ASSETS__"] = JSON.stringify(["/"])
	options.define["__CLIENT_ASSETS_HASH__"] = JSON.stringify("0")

	options.plugins = [logger]

	//
	const context = await esbuild.context(options)
	await context.watch()
	process.on("SIGINT", async () => {
		console.log("\nStopping SW esbuild...")
		await context.dispose()
		console.log("SW esbuild stopped, exiting.")
		process.exit(0)
	})
}

if (process.argv.includes("--build")) {
	build()
} else {
	watch()
}
