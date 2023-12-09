import { type PluginOption, defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import viteTsconfigPaths from "vite-tsconfig-paths"
import { ViteRawLoader } from "../scripts/ViteRawLoader.mjs"
import { config } from "dotenv"
config()

function SwHotReload(): PluginOption {
	return {
		name: "sw-hot-reload",
		handleHotUpdate({ file, server }) {
			if (file.endsWith("sw.js")) {
				console.log("Locale file updated")
				server.ws.send({
					type: "custom",
					event: "sw-rebuild",
				})
			}
		},
	}
}

export default defineConfig({
	plugins: [
		react(),
		viteTsconfigPaths({
			projects: ["./tsconfig.json"],
		}),
		ViteRawLoader(),
		SwHotReload(),
	],
	root: "./client",
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
	build: {
		emptyOutDir: true,
		outDir: "../dist/client",
		sourcemap: true,
		target: "esnext",
		assetsInlineLimit: 0,
	},
	esbuild: {
		minifyIdentifiers: false,
		keepNames: true,
	},
})
