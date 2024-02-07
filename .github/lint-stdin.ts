void (async function () {
	const readline = require("node:readline")

	const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
	const START = /^[^\s]+\s(\/[^\s]+)$/gm
	const LINE = /^[^\s]+\s+([\d]+):([\d]+)\s+([a-z]+)\s+(.*)\s\s(.*)$/gm

	let file = ""

	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")
		if (!file) {
			const match = START.exec(clean)
			if (match) {
				file = match[1]
			}
			continue
		}
		const match = LINE.exec(clean)
		if (!match) {
			file = ""
			continue
		}
		const [_, l, col, severity, message, rule] = match
		console.log(`::${severity} file=${file},line=${l},col=${col}::${message} (${rule})`)
	}
})()
