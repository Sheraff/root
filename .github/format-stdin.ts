void (async function () {
	const readline = await import("node:readline")

	const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
	const MATCHER = /^[^\s]+\s\[([a-z]+)\]\s([^\s]*)$/i
	const title = "Code style issues found in this file"
	const message = "Code style issues found in this file. Run Prettier to fix."

	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")

		const match = clean.match(MATCHER)
		if (!match) continue
		const [_, severity, file] = match
		console.log(`::error file=${file},title=${title}::${message}`)
	}
})()
