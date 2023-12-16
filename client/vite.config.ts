import { type PluginOption, defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import viteTsconfigPaths from "vite-tsconfig-paths"
import { ViteRawLoader } from "scripts/ViteRawLoader"
import { visualizer } from "rollup-plugin-visualizer"
import { config } from "dotenv"
import { rm } from "node:fs/promises"
config({ path: "../.env" })

function SwHotReload(): PluginOption {
	let id = 0
	return {
		name: "sw-hot-reload",
		handleHotUpdate({ file, server }) {
			if (file.endsWith("sw.js")) {
				console.log("SW rebuild detected, registering new worker...")
				server.ws.send({
					type: "custom",
					event: "sw-rebuild",
					data: { id: id++ },
				})
			}
		},
	}
}

function RemoveSwFilesFromBuild(): PluginOption {
	return {
		name: "remove-sw-files-from-build",
		closeBundle() {
			console.log('Removing "sw.js" and "sw.js.map" from build...')
			return Promise.all([
				rm("../dist/client/sw.js", { force: true }),
				rm("../dist/client/sw.js.map", { force: true }),
			]).then()
		},
	}
}

const plugins: PluginOption[] = [react(), viteTsconfigPaths(), ViteRawLoader(), SwHotReload()]

if (process.env.VITE_ANALYZE) {
	plugins.push(
		visualizer({
			open: true,
			brotliSize: true,
			gzipSize: true,
			openOptions: { app: { name: "google chrome" } },
		}),
	)
}

if (process.env.NODE_ENV === "production") {
	plugins.push(RemoveSwFilesFromBuild())
}

export default defineConfig({
	plugins,
	envDir: "..",
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
})
