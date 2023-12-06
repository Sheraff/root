import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: './shared',
  test: {
    alias: {
      '@shared': './shared',
    },
    // include: ['**/client/*.{test,spec}.?(c|m)[jt]s?(x)'],
    // exclude: ['**/node_modules/**', '**/build/**'],
    exclude: ['node_modules', 'dist', 'client', 'server'],
    passWithNoTests: true,
    // reporters: process.env.GITHUB_ACTIONS ? ['default', new VitestGHAReporter()] : 'default',
    cache: { dir: '../node_modules/.vitest/shared' },
    outputFile: '../node_modules/.vitest/shared.json',
  },
})
