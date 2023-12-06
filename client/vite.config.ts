import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import viteTsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	plugins: [
		react(),
		viteTsconfigPaths({
			projects: ["./tsconfig.json"],
		}),
		// {
		// 	name: "configure-response-headers",
		// 	configureServer: (server) => {
		// 		server.middlewares.use((_req, res, next) => {
		// 			res.setHeader("Service-Worker-Allowed", "/")
		// 			next()
		// 		})
		// 	},
		// },
	],
	root: "./client",
	server: {
		port: 3001,
		strictPort: true,
		// in dev mode, we use Vite's proxy to send all API requests to the backend
		proxy: {
			// "/sw": {
			// 	target: "http://localhost:3001/../dist/sw",
			// },
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
