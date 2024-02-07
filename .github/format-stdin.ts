void (async function () {
	const readline = require("node:readline")

	const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
	const MATCHER = /^[^\s]+\s\[([a-z]+)\]\s(.*)$/gm
	const message = "Code style issues found in this file. Run Prettier to fix."

	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")
		while (true) {
			const match = MATCHER.exec(clean)
			if (!match) break
			const [_, severity, file] = match
			console.log(`::error file=${file}::${message}`)
		}
	}
})()
