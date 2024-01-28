import { type PluginOption, defineConfig, normalizePath, type Logger } from "vite"
import react from "@vitejs/plugin-react-swc"

import { visualizer } from "rollup-plugin-visualizer"
import { config } from "dotenv"
import { readFile, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { compressBuffer } from "scripts/compressBuffer"
import { ViteRawLoader } from "scripts/ViteRawLoader"
import { walkFsTree } from "scripts/walkFsTree"

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
			_logger.info('Removing "sw.js" and "sw.js.map" from build...')
			return Promise.all([
				rm(join(outRoot, "sw.js"), { force: true }),
				rm(join(outRoot, "sw.js.map"), { force: true }),
			])
				.catch()
				.then()
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
			_logger.info("Compressing files...")
			const promises: Promise<unknown>[] = []
			const stats = {
				before: 0,
				after: 0,
				count: 0,
			}
			const extensions = /\.(js|wasm|css)$/
			await walkFsTree(outRoot, (node) => {
				if (node.stats.isDirectory()) return
				if (!extensions.test(node.path)) return
				if (node.path.endsWith("/sw.js")) return
				stats.count++
				promises.push(
					readFile(node.path)
						.then((buffer) => {
							stats.before += buffer.byteLength
							if (buffer.byteLength < 1501) {
								stats.after += buffer.byteLength
								return
							}
							return compressBuffer(buffer)
						})
						.then((compressed) => {
							if (!compressed) return
							stats.after += compressed.byteLength
							const compressedPath = node.path + ".br"
							writeFile(compressedPath, compressed)
						})
						.catch((error) => _logger.error(error))
				)
			})
			await Promise.all(promises)
			if (stats.count > 0) {
				const percent = Math.round((stats.after / stats.before) * 100)
				_logger.info(
					`Compressed ${stats.before} bytes to ${stats.after} bytes (${percent}%) in ${stats.count} files`
				)
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
