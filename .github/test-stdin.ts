import { spawn } from "node:child_process"
import * as readline from "node:readline"

const LINE = /^::error/
const BODY = /^::error\s(.*)::(.*)$/

const [, , step, cmd, ...args] = process.argv

if (!cmd) throw new Error("No command provided")

const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env })
child.stdout.on("data", processLines)
child.stderr.on("data", processLines)
child.on("close", process.exit)

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
		const p: { title: string; file: string; line: string; col: string } = Object.fromEntries(
			body?.split(",").map((part) => part.split("=")) ?? []
		)

		console.log(
			`::error file=${p.file},line=${p.line},col=${p.col},title=${step} > ${p.title}::${decodeURIComponent(p.title)}%0A${message}`
		)
	}
}
