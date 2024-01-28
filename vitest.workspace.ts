import { defineWorkspace } from "vitest/config"

export default defineWorkspace([
	"client/vite.config.ts",
	"server/vitest.config.ts",
	"shared/vitest.config.ts",
	"script/vitest.config.ts",
	"worker/vitest.config.ts",
])
