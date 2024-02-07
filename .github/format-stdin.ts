import * as readline from "node:readline"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const MATCHER = /^([^\s]+)\s\[([a-z]+)\]\s([^\s]*)$/i
const title = "Code style issues found in this file"
const message = "Code style issues found in this file. Run Prettier to fix."

for await (const line of readline.createInterface({ input: process.stdin })) {
	console.log(line)
	const clean = line.replace(CLEAN, "")

	const match = clean.match(MATCHER)
	if (!match) continue
	const [_, script, severity, file] = match
	let root = script!.split(":", 1)[0] + "/"
	if (root === "///") root = ""
	console.log(`::error file=${root}${file},title=${title}::${message}`)
}
