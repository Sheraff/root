import { defineWorkspace } from "vitest/config"

export default defineWorkspace([
	"client/vite.config.ts",
	"server/vitest.config.ts",
	"shared/vitest.config.ts",
	"scripts/vitest.config.ts",
	"sw/vitest.config.ts",
])
