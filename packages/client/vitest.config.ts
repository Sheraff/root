import viteTsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [viteTsconfigPaths()],
  test: {
    exclude: ['**/node_modules/**', '**/build/**'],
    passWithNoTests: true,
    // reporters: process.env.GITHUB_ACTIONS ? ['default', new VitestGHAReporter()] : 'default',
  },
})
