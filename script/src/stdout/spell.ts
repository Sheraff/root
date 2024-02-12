import { spawn } from "node:child_process"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const MATCHER = /^([^\s]+)\s\.\/([^:]+):([\d]+):([\d]+) - ([^(]+)\s\(([^)]+)\)$/i
const step = process.env.STEP_NAME ?? "spell"
const [, , cmd, ...args] = process.argv

if (!cmd) throw new Error("No command provided")

const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env })
child.stdout.pipe(process.stdout)
child.stdout.on("data", processLines)
child.on("close", (code) => process.exit(code ?? 0))

function processLines(data: Buffer) {
	const lines = String(data).split("\n")
	for (const line of lines) {
		const clean = line.replace(CLEAN, "")

		const match = clean.match(MATCHER)
		if (!match) continue
		const [_, script, file, l, col, message, word] = match
		let root = script!.split(":", 1)[0] + "/"
		if (root === "///") root = ""
		console.log(
			`::error file=${root}${file},line=${l},col=${col},title=${step} > ${message}::${message} "${word}"`
		)
	}
}
