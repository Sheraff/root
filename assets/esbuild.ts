import chalk from "chalk"
import { watch as chokidar } from "chokidar"
import { createHash } from "node:crypto"
import { type Stats } from "node:fs"
import { writeFile, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { walkFsTree } from "script/walkFsTree"

function onChange(path: string, stats: Stats | undefined) {
	// read all files in the directory
	const dir = stats?.isFile() ? dirname(path) : path
	readFile(join(dir, "meta", "_journal.json"), "utf8").then((data) => {
		const journal = JSON.parse(data) as {
			entries: Array<{
				idx: number
				version: string
				when: number
				tag: string
				breakpoints: boolean
			}>
		}
		Promise.all(
			journal.entries.map((entry) =>
				readFile(join(dir, entry.tag + ".sql"), "utf8").then((data) => ({
					sql: data
						.split("--> statement-breakpoint")
						.map((s) => s.trim())
						.filter(Boolean),
					bps: entry.breakpoints,
					folderMillis: entry.when,
					hash: createHash("sha256").update(data).digest("hex"),
				}))
			)
		).then((migrations) => {
			const result = JSON.stringify(migrations, null, 2)
			const resultPath = join(dir, "..", "migrations.json")
			writeFile(resultPath, result).then(() => {
				console.log(chalk.gray("compiled migrations:"), chalk.green(resultPath))
				for (const entry of journal.entries) {
					console.log(
						chalk.gray("  -"),
						chalk.white(`${entry.tag}.sql`),
						chalk.gray(`#${entry.idx} v${entry.version} @${entry.when}`)
					)
				}
			}, console.error)
		}, console.error)
	}, console.error)
}

function watch() {
	const watcher = chokidar("./src/*/migrations/*.sql", {
		ignoreInitial: false,
		persistent: true,
		atomic: true,
		awaitWriteFinish: {
			stabilityThreshold: 50,
		},
	})

	watcher.on("add", onChange)
	watcher.on("change", onChange)
	watcher.on("unlink", onChange)

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	process.on("SIGINT", async () => {
		console.log("\nStopping assets watcher...")
		await watcher.close().catch(console.error)
		console.log("Assets watcher stopped, exiting.")
		process.exit(0)
	})
}

async function build() {
	const current = dirname(new URL(import.meta.url).pathname)
	const promises: Array<Promise<any>> = []
	await walkFsTree(join(current, "src"), ({ path, stats }) => {
		if (!stats.isDirectory()) return
		if (path.match(/src\/[^/]+\/migrations$/)) {
			onChange(path, stats)
		}
	})
	return promises
}

if (process.argv.includes("--build")) {
	void build()
} else {
	watch()
}
