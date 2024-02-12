import { spawn } from "node:child_process"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const CATEGORY = /^([\w\s]+)\s\([\d]+\)$/
const MATCHER = /^(?:((?:[\w@\-/]\s?)+)\s\s)?(?:((?:\w\s?)+)\s\s)?([^\s:]+)(?::([\d]+):([\d]+))?$/i
let category = ""
const step = process.env.STEP_NAME ?? "knip"
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

		{
			const match = clean.match(CATEGORY)
			if (match) {
				category = match[1]!
				continue
			}
		}

		const match = clean.match(MATCHER)
		if (!match) {
			continue
		}
		const [_, name, type, file, l = 0, col = 0] = match
		let message = category
		if (name) message += `: \`${name}\``
		if (type) message += ` (${type})`
		console.log(
			`::error file=${file},line=${l},col=${col},title=${step} > ${category}::${message}`
		)
	}
}
