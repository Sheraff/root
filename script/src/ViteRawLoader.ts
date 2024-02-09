// import { readFile } from "node:fs/promises"
import { extname } from "node:path"
import { type Plugin } from "vite"

export function ViteRawLoader(): Plugin {
	return {
		name: "vite-plugin-raw-loader",
		load(url) {
			const extension = extname(url)
			if (extension === ".sql" || extension === ".txt") {
				return `export default ""`
				// return readFile(url, "utf8").then((source) => `export default \`${source}\``)
			}
		},
		// handleHotUpdate({ file, server }) {
		// 	if (extname(file) !== ".string") return
		// 	server.ws.send({ type: "update", updates: [{ type: "js-update" }] })
		// },
	}
}
