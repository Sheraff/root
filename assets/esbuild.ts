import { watch as chokidar } from "chokidar"
import { writeFile } from "node:fs/promises"
import { basename, dirname, join, relative } from "node:path"
import { walkFsTree } from "scripts/walkFsTree"

function dTsTemplate(name: string) {
	return `declare const query: string
export = query
//# sourceMappingURL=${name}.d.ts.map
`
}

function dTsMapTemplate(name: string) {
	return `{"version":3,"file":"${name}.d.ts","sourceRoot":"","sources":["${name}"],"names":[],"mappings":";AAAA"}`
}

async function buildMap(path: string) {
	const name = basename(path)
	const promise = Promise.all([
		writeFile(`${path}.d.ts`, dTsTemplate(name)),
		writeFile(`${path}.d.ts.map`, dTsMapTemplate(name)),
	])
	promise.then(() => console.log("Built TS maps for:", path))
	return promise
}

async function watch() {
	const watcher = chokidar("./src/*.sql", {
		ignoreInitial: false,
		persistent: true,
		atomic: true,
		awaitWriteFinish: {
			stabilityThreshold: 50,
		},
	})
	watcher.on("add", (path, stats) => {
		if (stats?.isFile()) {
			buildMap(path)
		}
	})
	process.on("SIGINT", async () => {
		console.log("Stopping assets watcher...")
		await watcher.close()
		process.exit(0)
	})
}

async function build() {
	const current = dirname(new URL(import.meta.url).pathname)
	const promises: Promise<any>[] = []
	await walkFsTree(join(current, "src"), ({ path, stats }) => {
		if (!path.endsWith(".sql")) return
		if (stats.isFile()) {
			const rel = relative(current, path)
			promises.push(buildMap(rel))
		}
	})
	return promises
}

if (process.argv.includes("--build")) {
	build()
} else {
	watch()
}
