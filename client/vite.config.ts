import { type PluginOption, defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import viteTsconfigPaths from "vite-tsconfig-paths"
import { ViteRawLoader } from "../scripts/ViteRawLoader.mjs"
import { config } from "dotenv"
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

export default defineConfig({
	plugins: [react(), viteTsconfigPaths(), ViteRawLoader(), SwHotReload()],
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
	},
	esbuild: {
		minifyIdentifiers: false,
		keepNames: true,
	},
})
