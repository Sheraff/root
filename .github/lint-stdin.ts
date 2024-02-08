import { spawn } from "node:child_process"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const START = /^[^\s]+\s(\/[^\s]+)$/
const LINE = /^[^\s]+\s+([\d]+):([\d]+)\s+([a-z]+)\s+(.*)\s\s(.*)$/i
let file = ""

const [, , step, cmd, ...args] = process.argv

if (!cmd) throw new Error("No command provided")

const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env })
child.stdout.pipe(process.stdout)
child.stdout.on("data", processLines)
child.on("close", process.exit)

function processLines(data: Buffer) {
	const lines = String(data).split("\n")
	for (const line of lines) {
		const clean = line.replace(CLEAN, "")
		if (!file) {
			const match = clean.match(START)
			if (match) {
				file = match[1]!
			}
			continue
		}
		const match = clean.match(LINE)
		if (!match) {
			file = ""
			continue
		}
		const [_, l, col, severity, message, rule] = match
		console.log(
			`::${severity} file=${file},line=${l},col=${col},title=${step} > ${rule}::${message} (${rule})`
		)
	}
}
