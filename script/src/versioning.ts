import { readFile } from "node:fs/promises"

const step = process.argv[2]
const from = process.argv[3]
const to = process.argv[4]

if (!from || !to) {
	throw new Error("Missing arguments")
}

const [fromPackage, toPackage] = (await Promise.all(
	[from, to].map((path) => readFile(path, "utf-8").then(JSON.parse))
)) as [{ version?: string }, { version?: string }]

const fromVersion = parseVersion(fromPackage.version)
const toVersion = parseVersion(toPackage.version)

const comparison = compareVersions(fromVersion, toVersion)

console.log(`Main: ${fromPackage.version} -> Current: ${toPackage.version}`)

if (comparison === 0) {
	console.log("Versions are the same")
} else if (comparison < 0) {
	console.log("New version is greater")
} else {
	console.log(
		`::error file=package.json,line=1,col=1,title=${step} > Package version cannot be lower than target branch::Main: ${fromPackage.version}%0ACurrent: ${toPackage.version}`
	)
	process.exit(1)
}

type Version = {
	major: number
	minor: number
	patch: number
	tag: { name: string; number: number } | null
}

function parseVersion(version?: string): Version {
	if (!version) return { major: 0, minor: 0, patch: 0, tag: null }
	const [main, spe] = version.split("-")
	if (!main) throw new Error("Invalid version")
	const [major, minor, patch] = main.split(".").map(Number)
	const [name, number] = spe?.split(".") ?? []
	const tag = name && number ? { name, number: Number(number) } : null
	return { major: major ?? 0, minor: minor ?? 0, patch: patch ?? 0, tag }
}

// function serializeVersion(version: Version): string {
// 	const main = `${version.major}.${version.minor}.${version.patch}`
// 	const spe = version.tag ? `-${version.tag.name}.${version.tag.number}` : ""
// 	return main + spe
// }

/**
 * - -1 if a < b,
 * - 0 if a === b
 * - 1 if a > b
 */
function compareVersions(a: Version, b: Version): number {
	if (a.major !== b.major) return a.major - b.major
	if (a.minor !== b.minor) return a.minor - b.minor
	if (a.patch !== b.patch) return a.patch - b.patch
	if (a.tag && b.tag) {
		if (a.tag.name !== b.tag.name) return a.tag.name.localeCompare(b.tag.name)
		return a.tag.number - b.tag.number
	}
	if (a.tag) return -1
	if (b.tag) return 1
	return 0
}
