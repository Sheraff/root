import { spawn } from "node:child_process"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const MATCHER = /^([^\s]+)\s\[([a-z]+)\]\s([^\s]*)$/i
const title = "Code style issues found in this file"
const message = "Code style issues found in this file. Run Prettier to fix."

const [, , step, cmd, ...args] = process.argv

if (!cmd) throw new Error("No command provided")

const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] })
child.stdout.pipe(process.stdout)
child.stdout.on("data", processLines)
child.stderr.pipe(process.stderr)
child.stderr.on("data", processLines)
child.on("close", process.exit)

async function processLines(data: Buffer) {
	const lines = String(data).split("\n")
	for await (const line of lines) {
		const clean = line.replace(CLEAN, "")

		const match = clean.match(MATCHER)
		if (!match) continue
		const [_, script, severity, file] = match
		let root = script!.split(":", 1)[0] + "/"
		if (root === "///") root = ""
		console.log(`::error file=${root}${file},title=${step} > ${title}::${message}`)
	}
}
