import * as readline from "node:readline"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const MATCHER =
	/([a-z:\/]+)\s([^\s].*)[\(:](\d+)[,:](\d+)(?:\):\s+|\s+-\s+)(error|warning|info)\s+TS(\d+)\s*:\s*(.*)$/
const step = process.argv[2]

void (async function () {
	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")

		const match = clean.match(MATCHER)
		if (!match) continue
		const [_, script, file, l, col, severity, code, message] = match
		let root = script!.split(":", 1)[0] + "/"
		if (root === "///") root = ""
		console.log(
			`::${severity} file=${root}${file},line=${l},col=${col},title=${step} > ${code}::${message} (${code})`
		)
	}
})()
