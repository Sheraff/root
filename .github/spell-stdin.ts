import * as readline from "node:readline"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const MATCHER = /^([^\s]+)\s\.\/([^:]+):([\d]+):([\d]+) - ([^(]+)\s\(([^)]+)\)$/i

void (async function () {
	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")

		const match = clean.match(MATCHER)
		if (!match) continue
		const [_, script, file, l, col, message, word] = match
		let root = script!.split(":", 1)[0] + "/"
		if (root === "///") root = ""
		console.log(
			`::error file=${root}${file},line=${l},col=${col},title=${message}::${message} (${word})`
		)
	}
})()
