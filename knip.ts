import type { KnipConfig } from "knip"

const config: KnipConfig = {
	ignoreDependencies: [
		// used by fastify, with just a string reference, no import
		"pino-pretty",
		// might not be used everywhere yet
		"@repo/assets",
	],
	ignore: ["**/*.test.ts", "**/types/*.d.ts"],
	includeEntryExports: true,
}

export default config
