import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import viteTsconfigPaths from "vite-tsconfig-paths"
import ViteSqlLoader from "../scripts/ViteSqlLoader.mjs"
import { config } from "dotenv"
config()

export default defineConfig({
	plugins: [
		react(),
		viteTsconfigPaths({
			projects: ["./tsconfig.json"],
		}),
		ViteSqlLoader(),
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
