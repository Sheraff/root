void (async function () {
	const readline = require("node:readline")

	const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
	const CATEGORY = /^([\w\s]+)\s\([\d]+\)$/gm
	const MATCHER = /^(?:((?:\w\s?)+)\s\s)?(?:((?:\w\s?)+)\s\s)?([^\s:]+)(?::([\d]+):([\d]+))?$/gim

	let category = ""

	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")

		while (true) {
			{
				const match = CATEGORY.exec(clean)
				if (match) {
					category = match[1]
					break
				}
				if (!category) break
			}

			const match = MATCHER.exec(clean)
			if (!match) break
			const [_, name, type, file, l = 0, col = 0] = match
			let message = category
			if (name) message += `: \`${name}\``
			if (type) message += ` (${type})`
			console.log(`::error file=${file},line=${l},col=${col}::${message}`)
		}
	}
})()
