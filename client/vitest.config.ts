import viteTsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [viteTsconfigPaths({
    projects: ['./tsconfig.json', './sw/tsconfig.json'],
  })],
  root: './client',
  test: {
    // include: ['**/client/*.{test,spec}.?(c|m)[jt]s?(x)'],
    // exclude: ['**/node_modules/**', '**/build/**'],
    exclude: ['node_modules', 'dist', 'server'],
    passWithNoTests: true,
    reporters: ['default'],
    // reporters: process.env.GITHUB_ACTIONS ? ['default', new VitestGHAReporter()] : 'default',
    cache: { dir: '../node_modules/.vitest/client' },
    outputFile: '../node_modules/.vitest/client.json',
  },
})
