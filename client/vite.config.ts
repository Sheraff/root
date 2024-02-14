import { type PluginOption, defineConfig, normalizePath } from "vite"
import react from "@vitejs/plugin-react-swc"

import { config } from "dotenv"
import { ViteRawLoader } from "script/ViteRawLoader"

config({ path: "../.env" })

const plugins: PluginOption[] = [react(), ViteRawLoader()]

export default defineConfig({
	plugins,
	envDir: "..",
	cacheDir: "../node_modules/.vite",
	resolve: {
		alias: {
			// use alias to avoid having "client" as a package dependency of "client"
			"client/": `${normalizePath(__dirname)}/src/`,
			// allow imports from "server" to resolve to the server folder, despite tsconfig aliases
			"server/": `${normalizePath(__dirname)}/../server/src/`,
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
		modulePreload: { polyfill: false },
		rollupOptions: {
			treeshake: {
				moduleSideEffects: [`${normalizePath(__dirname)}/main.tsx`],
				propertyReadSideEffects: false,
				tryCatchDeoptimization: false,
				unknownGlobalSideEffects: false,
			},
		},
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
