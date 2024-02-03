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
- a `script` folder for build-time shared code (node only, for CI, vite plugins, ...)
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
pnpm knip # check for unused code
pnpm clear # clear cache (turbo, vite, pnpm, esbuild, ...)
pnpm analyze # bundle size analysis
```

---

## TODO

- finish auth
  - better utils for "protected" stuff (client & server)
  - add endpoint for "which providers are already associated with current user"
    - on the client side, this can be used to hide the "associate" button for these providers
    - on the client side, this gives us the opportunity to make an "online-only" component demo
    - this is a good opportunity to make a trpc-like fullstack type-safe query system
- database
  - figure out migrations story
  - better DX (sync hook, db provider, ...)
