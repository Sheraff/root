void (async function () {
	const readline = await import("node:readline")

	const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
	const START = /^[^\s]+\s(\/[^\s]+)$/
	const LINE = /^[^\s]+\s+([\d]+):([\d]+)\s+([a-z]+)\s+(.*)\s\s(.*)$/i

	let file = ""

	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")
		if (!file) {
			const match = clean.match(START)
			if (match) {
				file = match[1]
			}
			continue
		}
		const match = clean.match(LINE)
		if (!match) {
			file = ""
			continue
		}
		const [_, l, col, severity, message, rule] = match
		console.log(`::${severity} file=${file},line=${l},col=${col}::${message} (${rule})`)
	}
})()
