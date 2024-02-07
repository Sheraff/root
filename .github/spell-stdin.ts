void (async function () {
	const readline = require("node:readline")

	const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
	const MATCHER = /\s\.\/([^:]+):([\d]+):([\d]+) - ([^(]+)\s\(([^)]+)\)$/gm

	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")

		const match = MATCHER.exec(clean)
		if (!match) continue
		const [_, file, l, col, message, word] = match
		console.log(`::error file=${file},line=${l},col=${col}::${message} (${word})`)
	}
})()
