const readline = require("node:readline")

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const MATCHER =
	/([a-z:\/]+)\s([^\s].*)[\(:](\d+)[,:](\d+)(?:\):\s+|\s+-\s+)(error|warning|info)\s+TS(\d+)\s*:\s*(.*)$/gm

void (async function () {
	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")
		while (true) {
			const match = MATCHER.exec(clean)
			if (!match) break
			const [_, script, file, l, col, severity, code, message] = match
			console.log(`::${severity} file=${file},line=${l},col=${col}::${message} (${code})`)
		}
	}
})()
