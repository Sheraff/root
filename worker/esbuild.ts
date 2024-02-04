/* eslint-disable no-undef */

import { compressBuffer } from "script/compressBuffer"
import * as esbuild from "esbuild"
import { readFile, readdir, writeFile, rm } from "node:fs/promises"
import { join } from "node:path"

import { loadEnv } from "vite"
import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import chalk from "chalk"
import { coloredFile } from "script/coloredFile"
import { readableTime } from "script/readableTime"
import { readableSize } from "script/readableSize"
import { walkFsTree } from "script/walkFsTree"

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
	if (buffer.byteLength < 1501) {
		console.log(
			chalk.gray("Skipping"),
			coloredFile(path),
			chalk.gray(`(too small: ${readableSize(buffer.byteLength)})`)
		)
		return
	}
	/** @type {Buffer} */
	const compressed = await compressBuffer(buffer)
	await writeFile(path + ".br", compressed)
	console.log(
		chalk.gray("Compressed"),
		coloredFile(path),
		chalk.gray(`(${readableSize(buffer.byteLength)} -> ${readableSize(compressed.byteLength)})`)
	)
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

	assets: {
		const outDir = join(process.cwd(), "../dist/client")
		const before = Date.now()
		console.log(chalk.green("emitting SW assets..."))
		const buildInclude = /\.(js|css|wasm)$/
		const buildFiles = readdir(join(outDir, "assets")).then((files) =>
			files.filter((f) => buildInclude.test(f)).map((f) => `/assets/${f}`)
		)
		const staticExclude = ["index.html"]
		const staticFiles = readdir(outDir, { withFileTypes: true }).then((files) =>
			files
				.filter(
					(f) =>
						f.isFile() &&
						!f.name.endsWith(".DS_Store") &&
						!staticExclude.includes(f.name)
				)
				.map((f) => `/${f.name}`)
		)
		const f = await Promise.all(["/", buildFiles, staticFiles])
		const files = f.flat()
		options.define["__CLIENT_ASSETS__"] = JSON.stringify(files)
		console.log(chalk.gray("SW cached assets list"))
		files.forEach((f) =>
			console.log(coloredFile(join("../dist/client", f === "/" ? "index.html" : f)))
		)

		// cache versioning
		const hash = createHash("sha256")
		for (let file of files) {
			file = file === "/" ? "index.html" : file
			const stream = createReadStream(join(outDir, file))
			stream.pipe(hash, { end: file === files[files.length - 1] })
			await new Promise((resolve) => stream.once("end", resolve))
		}
		const key = hash.digest("hex")
		options.define["__CLIENT_ASSETS_HASH__"] = JSON.stringify(key)
		console.log(chalk.gray("SW cached assets hash"), key)

		const delta = Date.now() - before
		console.log(chalk.green(`✓ assets emitted in ${readableTime(delta)}`))
	}
	build: {
		const before = Date.now()
		console.log(chalk.green("building service worker..."))
		await rm("../dist/worker", { force: true, recursive: true })
		await esbuild.build(options)
		const delta = Date.now() - before
		await walkFsTree("../dist/worker", (node) => {
			if (node.stats.isDirectory()) return
			if (node.path.endsWith(".map")) return
			console.log(
				coloredFile(node.path),
				chalk.bold(chalk.gray(readableSize(node.stats.size)))
			)
		})
		console.log(chalk.green(`✓ built in ${readableTime(delta)}`))
	}
	compress: {
		const before = Date.now()
		console.log(chalk.green("compressing service worker..."))
		await compressFile("../dist/worker/sw.js")
		const delta = Date.now() - before
		console.log(chalk.green(`✓ compressed in ${readableTime(delta)}`))
	}
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
