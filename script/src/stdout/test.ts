import { spawn } from "node:child_process"

const LINE = /^::error/
const BODY = /^::error\s(.*)::(.*)$/
const step = process.env.STEP_NAME ?? "test"
const [, , cmd, ...args] = process.argv

if (!cmd) throw new Error("No command provided")

const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env })
child.stdout.on("data", processLines)
child.stderr.on("data", processLines)
child.on("close", (code) => process.exit(code ?? 0))

function processLines(data: Buffer) {
	const lines = String(data).split("\n")
	if (lines[0] === "") lines.shift()
	if (lines.at(-1) === "") lines.pop()
	for (const line of lines) {
		const isErrorLine = line.match(LINE)
		if (!isErrorLine) {
			console.log(line)
			continue
		}
		const match = line.match(BODY)
		if (!match) continue
		const [_, body, message] = match
		const p = Object.fromEntries(body?.split(",").map((part) => part.split("=")) ?? []) as {
			title: string
			file: string
			line: string
			col: string
		}
		const cleanTitle = decodeURIComponent(p.title)
		const errorType = cleanTitle.split(":", 2)
		const title = errorType.length > 1 ? errorType[0] : p.title

		console.log(
			`::error file=${p.file},line=${p.line},col=${p.col},title=${step} > ${title}::${cleanTitle}%0A${message}`
		)
	}
}
