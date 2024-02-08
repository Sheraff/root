import chalk from "chalk"
import { basename, dirname, relative } from "node:path"

export function coloredFile(file: string) {
	const rel = relative(process.cwd(), file)
	const path = dirname(rel)
	const name = basename(rel)
	const color = name.endsWith(".js")
		? chalk.cyan
		: name.endsWith(".css")
			? chalk.magenta
			: chalk.green
	return `${chalk.gray(path + "/")}${color(name)}`
}
