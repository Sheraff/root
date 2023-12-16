import { readFileSync } from "fs"
import { join } from "path"

/**
 * We need to manually populate process.env because
 * Vite only loads in variables prefixed with VITE_
 * (or whatever envPrefix is set to, but not empty).
 *
 * This should only be done on the server tests.
 */

const extra = Object.fromEntries(
	readFileSync(join(__dirname, "..", ".env"), "utf-8")
		.split("\n")
		.filter((l) => l.trim() && !l.startsWith("#"))
		.map((l) => l.split("=", 2)),
)

Object.assign(process.env, extra)