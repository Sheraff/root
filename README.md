# Fullstack TypeScript Offline-First PWA Template

## TODO

- finish auth
  - better utils for "protected" stuff (client & server)
- database
  - figure out migrations story
  - we shouldn't need dynamic schema imports, use regular import, and hash content for "schema name"
    - this would also allow us to remove chokidar entirely
  - better DX (sync hook, db provider, ...)
    - bonus: replace vlcn `useQuery` with React-Query (and same for mutations)
- fix imports from /scripts (type issue in /shared)
- fix knip (doesn't detect imports from /shared)

## Client Package

A typescript React application, with

- Vitest
- Vite
- SQLite (vlcn.io CRDTs)

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
- `/node_modules` (because imports aren't bundled)

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
pnpm ts-check # typescript check
pnpm deps # check for unused code
pnpm clear # clear cache (turbo, vite, pnpm, esbuild, pnpm)
```
