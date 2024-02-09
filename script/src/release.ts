import { exec, execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const currentBranch = execSync("git branch --show-current").toString().trim()
if (currentBranch !== "main") {
	throw new Error("You can only release from the main branch")
}

const currentTag = execSync("git describe --tags --abbrev=0").toString().trim()
console.log(`Current tag: ${currentTag}`)

const major = process.argv.includes("--major")
const minor = process.argv.includes("--minor")
const patch = process.argv.includes("--patch")
const tag = process.argv.find((arg) => arg.startsWith("--tag="))?.split("=")[1] ?? false

const packageJson = JSON.parse(readFileSync("package.json", "utf-8")) as { version?: string }
const current = parseVersion(packageJson.version)

if (Number(major) + Number(minor) + Number(patch) + Number(Boolean(tag)) > 1) {
	throw new Error("Only one version bump is allowed")
}

if (major) {
	current.major++
	current.minor = 0
	current.patch = 0
	current.tag = null
} else if (minor) {
	current.minor++
	current.patch = 0
	current.tag = null
} else if (patch) {
	current.patch++
	current.tag = null
} else if (tag) {
	if (current.tag?.name === tag) {
		current.tag.number++
	} else {
		current.tag = { name: tag, number: 0 }
	}
} else if (current.tag) {
	current.tag.number++
} else {
	current.patch++
}

const newVersion = serializeVersion(current)
packageJson.version = newVersion
writeFileSync("package.json", JSON.stringify(packageJson, null, "\t") + "\n")

const a = exec(
	`
	git add package.json;
	git tag v${newVersion};
	git commit -m "Release v${newVersion}";
	git push origin --tags;
`
)

a.stdout?.pipe(process.stdout)
a.stderr?.pipe(process.stderr)

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

function serializeVersion(version: Version): string {
	const main = `${version.major}.${version.minor}.${version.patch}`
	const spe = version.tag ? `-${version.tag.name}.${version.tag.number}` : ""
	return main + spe
}
