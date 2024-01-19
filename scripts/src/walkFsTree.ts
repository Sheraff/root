import type { Stats } from "node:fs"
import { readdir, stat } from "node:fs/promises"
import { join } from "node:path"

type NodeCallback = (node: {
	path: string
	stats: Stats
}) => Promise<void | undefined | boolean> | void | boolean

async function recurse(initial_folder: string, nodeCallback: NodeCallback): Promise<number> {
	let count = 0
	let files: string[]

	try {
		files = await readdir(initial_folder)
	} catch (cause) {
		throw new Error(`Error while reading directory ${initial_folder}`, { cause })
	}

	await Promise.all(
		files.map(async (file) => {
			count++
			const full_path = join(initial_folder, file)
			let stats: Stats

			try {
				stats = await stat(full_path)
			} catch (cause) {
				throw new Error(`Error while reading file ${full_path}`)
			}

			let result: boolean | undefined | void

			try {
				result = await nodeCallback({ path: full_path, stats })
			} catch (cause) {
				throw new Error(`Error during \`nodeCallback\` for item ${full_path}`)
			}

			if (result === false) return

			if (stats.isDirectory()) {
				const add = await recurse(full_path, nodeCallback)
				count += add
			}
		}),
	)

	return count
}

/**
 * @param initial_folder absolute path to the folder to start the search from
 * @param nodeCallback if this callback returns `false`, the current node will not be recursed into
 */
async function walkFsTree(initial_folder: string, nodeCallback: NodeCallback): Promise<void> {
	await recurse(initial_folder, nodeCallback)
}

export { walkFsTree }
