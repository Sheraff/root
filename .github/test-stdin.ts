import * as readline from "node:readline"

const LINE = /^::error/
const BODY = /^::error\s(.*)::(.*)$/
const step = process.argv[2]

void (async function () {
	for await (const line of readline.createInterface({ input: process.stdin })) {
		const isErrorLine = line.match(LINE)
		if (!isErrorLine) {
			console.log(line)
			continue
		}
		const match = line.match(BODY)
		if (!match) continue
		const [_, body, message] = match
		const p: { title: string; file: string; line: string; col: string } = Object.fromEntries(
			body?.split(",").map((part) => part.split("=")) ?? []
		)

		console.log(
			`::error file=${p.file},line=${p.line},col=${p.col},title=${step} > ${p.title}::${p.title}%0A${message}`
		)
	}
})()
