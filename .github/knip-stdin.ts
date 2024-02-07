import * as readline from "node:readline"

const CLEAN = /(?:\x1B\[([0-9;]+)m)?/g
const CATEGORY = /^([\w\s]+)\s\([\d]+\)$/
const MATCHER = /^(?:((?:\w\s?)+)\s\s)?(?:((?:\w\s?)+)\s\s)?([^\s:]+)(?::([\d]+):([\d]+))?$/i

let category = ""

void (async function () {
	for await (const line of readline.createInterface({ input: process.stdin })) {
		console.log(line)
		const clean = line.replace(CLEAN, "")

		{
			const match = clean.match(CATEGORY)
			if (match) {
				category = match[1]!
				continue
			}
		}

		const match = clean.match(MATCHER)
		if (!match) {
			category = ""
			continue
		}
		const [_, name, type, file, l = 0, col = 0] = match
		let message = category
		if (name) message += `: \`${name}\``
		if (type) message += ` (${type})`
		console.log(`::error file=${file},line=${l},col=${col},title=${category}::${message}`)
	}
})()
