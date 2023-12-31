//@ts-check
/// <reference types="node" />

import { readFileSync } from "node:fs"
import { extname } from "node:path"
import { type Plugin } from "vite"

export function ViteRawLoader(): Plugin {
	return {
		name: "vite-plugin-raw-loader",
		async load(url) {
			const extension = extname(url)
			if (extension === ".sql" || extension === ".txt") {
				const input = readFileSync(url, "utf8")
				return `export default \`${input}\``
			}
		},
		// handleHotUpdate({ file, server }) {
		// 	if (extname(file) !== ".string") return
		// 	server.ws.send({ type: "update", updates: [{ type: "js-update" }] })
		// },
	}
}
