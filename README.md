# Fullstack TypeScript Offline-First PWA Template

## Client Package

A typescript React application, with

- Vitest
- Vite
- SQLite (vlcn.io CRDTs)
- Tanstack Query + useQuery hook for SQLite

## Server Package

A typescript Fastify server, with

- sqlite database
- SQLite (vlcn.io CRDTs)
- esbuild
- Vitest
- oauth through 3rd party providers

## Service Worker Package

A typescript service worker, with

- esbuild
- Hot Module Reloading

## Root Level

A workspace, with

- pnpm (package manager / script runner)
- eslint (code quality)
- prettier (code formatting)
- knip (dead code elimination)
- turbo (monorepo manager / script cache)
- valibot (data validation)
- ts-reset (better typescript defaults)
- a `scripts` folder for build-time shared code (node only, for CI, vite plugins, ...)
- a `shared` folder for run-time shared code (all environments, for client, server, service worker, ...)

## Getting Started

To get started with this project, clone the repository and install the dependencies with pnpm:

```shell
pnpm install
```

To start the development server, run:

```shell
pnpm dev
```

In dev mode, all requests go through Vite's dev server, and all `/api` requests are forwarded to the Fastify server.

To serve the production build, run:

```shell
pnpm serve
```

In production mode, all requests go through the Fastify server.

To build the project for production, run:

```shell
pnpm build
```

The folders necessary for running the project after it has been built are:
- `/dist`
- `/db` (though it will be generated if it doesn't exist)
- `/node_modules` (because not all imports are bundled)

To test the project, run:

```shell
pnpm test
```

---

## Other useful commands

```shell
pnpm format # prettier check
pnpm format:fix # prettier fix
pnpm lint # eslint check
pnpm lint:fix # eslint fix
pnpm tsc # typescript check
pnpm deps # check for unused code
pnpm clear # clear cache (turbo, vite, pnpm, esbuild, pnpm)
```

---

## TODO

- probably need to revert [673821c9e927e22cc960bd04491d481a7a4401d4](https://github.com/Sheraff/root/commit/673821c9e927e22cc960bd04491d481a7a4401d4) because we got errors
  > server:tsc: src/app.ts(8,24): error TS6305: Output file '/Users/Flo/GitHub/fullstack-copilot/root/shared/.dist/src/foo/bar.d.ts' has not been built from source file '/Users/Flo/GitHub/fullstack-copilot/root/shared/src/foo/bar.ts'.
- create folder for schemas, no need for actual package, just TS aliases to a folder at the root
  ```json
  "@schemas/*": ["../shared/src/schemas/*"],
  ```
  This allows for better search of .sql files (since this won't be auto-imported unless we do complicated build / dev step)

- setup
  - fix tsconfig (& cie) to have
    - import suggestion from every repo
    - extension-less imports (or at least correct extension in the suggestions)
    - dependencies (scripts / shared) work after install / dev / build
  - rename ./dist folder to ./.dist (for uniformity with in-package builds)
- finish auth
  - better utils for "protected" stuff (client & server)
- database
  - figure out migrations story
  - we shouldn't need dynamic schema imports, use regular import, and hash content for "schema name"
    - this would also allow us to remove chokidar entirely
  - better DX (sync hook, db provider, ...)



What I want

- tricky folders
  - `/scripts` for build-time code (CI, vite / vitest plugins, ...), node only
  - `/shared` for run-time code (client, server, service worker), node & browser
- TS everywhere (ideally no JSDoc / .mjs / .d.ts)
- vscode import autocomplete across packages
- go-to-definition works (doesn't send you to an obscure .d.ts file)
- no barrel files, autocomplete proposes deep imports
- ideally `/shared` doesn't need to be built, because it would mean a long running task depending on another long running task
- `knip` understands the config
- "exotic imports" (.sql) work across packages
  - bonus: go to definition works
  - bonus: import autocomplete works
- bonus: imports have nice names (like `@shared/foo`) to avoid collisions with local stuff
