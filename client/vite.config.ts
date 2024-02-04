import { type PluginOption, defineConfig, normalizePath, type Logger } from "vite"
import react from "@vitejs/plugin-react-swc"

import { visualizer } from "rollup-plugin-visualizer"
import { config } from "dotenv"
import { readFile, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { compressBuffer } from "script/compressBuffer"
import { ViteRawLoader } from "script/ViteRawLoader"
import { walkFsTree } from "script/walkFsTree"
import { coloredFile } from "script/coloredFile"
import { readableTime } from "script/readableTime"
import chalk from "chalk"
import { readableSize } from "script/readableSize"

config({ path: "../.env" })

function SwHotReload(): PluginOption {
	let id = 0
	let _logger: Logger
	return {
		name: "sw-hot-reload",
		apply: "serve",
		configResolved({ logger }) {
			_logger = logger
		},

		handleHotUpdate({ file, server, timestamp }) {
			if (file.endsWith("sw.js")) {
				server.ws.send({
					type: "custom",
					event: "sw-rebuild",
					data: { id: id++ },
				})
				const time = new Date(timestamp).toLocaleTimeString("en-US")
				_logger.info(`${time} [SW] hmr update, registering new worker...`)
			}
		},
	}
}

function RemoveSwFilesFromBuild(): PluginOption {
	let _logger: Logger
	let outRoot: string
	return {
		name: "remove-sw-files-from-build",
		apply: "build",
		configResolved({ logger, root, build: { ssr, outDir } }) {
			if (ssr) return
			_logger = logger
			outRoot = normalizePath(resolve(root, outDir))
		},
		closeBundle() {
			if (!outRoot) return
			const toRemove = [join(outRoot, "sw.js"), join(outRoot, "sw.js.map")]
			let logged = false
			return Promise.all(
				toRemove.map((file) =>
					rm(file, { force: true }).then(() => {
						if (!logged) {
							logged = true
							_logger.info(chalk.green("removing SW development files from build..."))
						}
						_logger.info(`${chalk.gray("Removed")} ${coloredFile(file)}`)
					})
				)
			)
				.catch()
				.then(() => _logger.info(chalk.green("✓ removed service worker files")))
		},
	}
}

function Compress(): PluginOption {
	let _logger: Logger
	let outRoot: string
	return {
		name: "compress",
		apply: "build",
		enforce: "post",
		configResolved({ logger, root, build: { outDir, ssr } }) {
			if (ssr) return
			_logger = logger
			outRoot = normalizePath(resolve(root, outDir))
		},
		async closeBundle() {
			if (!outRoot) return
			const start = Date.now()

			const promises: Promise<unknown>[] = []
			const stats = {
				before: 0,
				after: 0,
				count: 0,
			}
			const extensions = /\.(js|wasm|css)$/
			let logged = false
			await walkFsTree(outRoot, (node) => {
				if (node.stats.isDirectory()) return
				if (!extensions.test(node.path)) return
				if (node.path.endsWith("/sw.js")) return
				stats.count++
				let before = 0
				if (!logged) {
					_logger.info(chalk.green("compressing files with brotli..."))
					logged = true
				}
				promises.push(
					readFile(node.path)
						.then((buffer) => {
							before = buffer.byteLength
							stats.before += before
							if (before < 1501) {
								stats.after += before
								_logger.info(
									`Skipping ${coloredFile(node.path)} ${chalk.gray(`(too small: ${readableSize(before)})`)}`
								)
								return
							}
							return compressBuffer(buffer)
						})
						.then((compressed) => {
							if (!compressed) return
							const after = compressed.byteLength
							stats.after += after
							const compressedPath = node.path + ".br"
							writeFile(compressedPath, compressed).catch((error) =>
								_logger.error(String(error))
							)
							_logger.info(
								`Compress ${coloredFile(node.path)} ${chalk.gray("from")} ${chalk.bold(readableSize(before))} ${chalk.gray("to")} ${chalk.bold(readableSize(after))} ${chalk.gray(`| ${Math.round((after / before) * 100)}%`)}`
							)
						})
						.catch((error) => _logger.error(String(error)))
				)
			})
			await Promise.all(promises)
			if (stats.count > 0) {
				const delta = Date.now() - start
				const percent = Math.round((stats.after / stats.before) * 100)
				_logger.info(
					`${chalk.gray("Summary: ")}${chalk.bold(readableSize(stats.before))} ${chalk.gray("to")} ${chalk.bold(readableSize(stats.after))} ${chalk.gray(`(${percent}% of ${stats.count} files)`)}`
				)
				_logger.info(chalk.green(`✓ compressed in ${readableTime(delta)}`))
			}
		},
	}
}

/** @see https://github.com/vitejs/vite/issues/15012 */
const MuteWarningsPlugin = (...warningsToIgnore: [string, string][]): PluginOption => {
	const mutedMessages = new Set()
	return {
		name: "mute-warnings",
		enforce: "pre",
		config: (userConfig) => ({
			build: {
				rollupOptions: {
					onwarn(warning, defaultHandler) {
						if (warning.code) {
							const muted = warningsToIgnore.find(
								([code, message]) =>
									code == warning.code && warning.message.includes(message)
							)

							if (muted) {
								mutedMessages.add(muted.join())
								return
							}
						}

						if (userConfig.build?.rollupOptions?.onwarn) {
							userConfig.build.rollupOptions.onwarn(warning, defaultHandler)
						} else {
							defaultHandler(warning)
						}
					},
				},
			},
		}),
		closeBundle() {
			const diff = warningsToIgnore.filter((x) => !mutedMessages.has(x.join()))
			if (diff.length > 0) {
				this.warn("Some of your muted warnings never appeared during the build process:")
				diff.forEach((m) => this.warn(`- ${m.join(": ")}`))
			}
		},
	}
}

const plugins: PluginOption[] = [
	react(),
	ViteRawLoader(),
	SwHotReload(),
	RemoveSwFilesFromBuild(),
	Compress(),
	MuteWarningsPlugin(["SOURCEMAP_ERROR", "Can't resolve original location of error"]),
]

if (process.env.VITE_ANALYZE) {
	plugins.push(
		visualizer({
			open: true,
			brotliSize: true,
			gzipSize: true,
			openOptions: { app: { name: "google chrome" } },
		})
	)
}

export default defineConfig({
	plugins,
	envDir: "..",
	cacheDir: "../node_modules/.vite",
	resolve: {
		alias: {
			// use alias to avoid having "client" as a package dependency of "client"
			"client/": `${normalizePath(__dirname)}/src/`,
		},
	},
	server: {
		port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
		strictPort: true,
		// in dev mode, we use Vite's proxy to send all API requests to the backend
		proxy: {
			"/api": {
				target: `http://localhost:${process.env.DEV_PROXY_SERVER_PORT ?? 8123}`,
				changeOrigin: true,
				secure: false,
			},
		},
	},
	optimizeDeps: {
		exclude: [
			// wasm gets lost if this package is optimized by vite
			"@vlcn.io/crsqlite-wasm",
		],
		esbuildOptions: {
			target: "esnext",
		},
	},
	build: {
		emptyOutDir: true,
		outDir: "../dist/client",
		sourcemap: true,
		target: "esnext",
		reportCompressedSize: false,
	},
	esbuild: {
		minifyIdentifiers: false,
		keepNames: true,
	},
	define: {
		__AUTH_PROVIDERS__: [
			{ name: "twitch", enabled: !!process.env.TWITCH_CLIENT_ID },
			{ name: "google", enabled: !!process.env.GOOGLE_CLIENT_ID },
			{ name: "spotify", enabled: !!process.env.SPOTIFY_CLIENT_ID },
			{ name: "discord", enabled: !!process.env.DISCORD_CLIENT_ID },
		]
			.filter((p) => p.enabled)
			.map((p) => p.name),
	},
	test: {
		passWithNoTests: true,
		alias: [
			{ find: /^(.*)\.txt$/, replacement: "$1.txt?raw" },
			{ find: /^(.*)\.sql$/, replacement: "$1.sql?raw" },
		],
	},
})
