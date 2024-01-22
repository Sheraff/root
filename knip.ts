import type { KnipConfig } from 'knip'

const config: KnipConfig = {
	"ignoreDependencies": [
		// used by fastify, with just a string reference, no import
		"pino-pretty",
		// might not be used everywhere yet
		"assets",
	],
	"ignore": [
		"**/*.test.ts"
	],
	"includeEntryExports": true,
}

export default config;

