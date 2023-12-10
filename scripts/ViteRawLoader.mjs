//@ts-check
/// <reference types="node" />

import { readFileSync } from "node:fs"
import { extname } from "node:path"

/**
 * @returns {import('vite').Plugin}
 */
export function ViteRawLoader() {
	return {
		name: "vite-plugin-raw-loader",
		async load(url) {
			this.setAssetSource
			const extension = extname(url)
			if (extension === ".sql") {
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
