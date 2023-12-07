import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import viteTsconfigPaths from "vite-tsconfig-paths"
import ViteSqlLoader from "../scripts/ViteSqlLoader.mjs"

export default defineConfig({
	plugins: [
		react(),
		viteTsconfigPaths({
			projects: ["./tsconfig.json"],
		}),
		ViteSqlLoader(),
	],
	root: "./client",
	server: {
		port: 3001,
		strictPort: true,
		// in dev mode, we use Vite's proxy to send all API requests to the backend
		proxy: {
			"/api": {
				target: "http://localhost:3000",
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
