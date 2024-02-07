void (async function () {
	const readline = await import("node:readline")

	const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
	const MATCHER =
		/([a-z:\/]+)\s([^\s].*)[\(:](\d+)[,:](\d+)(?:\):\s+|\s+-\s+)(error|warning|info)\s+TS(\d+)\s*:\s*(.*)$/

	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")

		const match = clean.match(MATCHER)
		if (!match) continue
		const [_, script, file, l, col, severity, code, message] = match
		console.log(`::${severity} file=${file},line=${l},col=${col}::${message} (${code})`)
	}
})()
