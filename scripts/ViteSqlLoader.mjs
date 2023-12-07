//@ts-check
/// <reference types="node" />

import { readFileSync } from "node:fs"
import { extname } from "node:path"

/**
 * @returns {import('vite').Plugin}
 */
export default function ViteSqlLoader() {
	return {
		name: "vite-plugin-sql-loader",
		async load(url) {
			if (extname(url) !== ".sql") return
			const input = readFileSync(url, "utf8")
			return `export default const sql = ${JSON.stringify(input)}`
		},
		// handleHotUpdate({ file, server }) {
		// 	if (extname(file) !== ".sql") return
		// 	server.ws.send({ type: "update", updates: [{ type: "js-update" }] })
		// },
	}
}
