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
- eslint w/ type-aware linting (code quality)
- prettier (code formatting)
- knip (dead code elimination)
- turbo (monorepo manager / script cache)
- valibot (data validation)
- ts-reset (better typescript defaults)
- cspell (code spell-checking)
- github actions (CI/CD)
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

The assets necessary for running the project after it has been built are:
- `/dist`
- `.env`
- `/node_modules` (because not all imports are bundled)
- `/db` (though it will be generated if it doesn't exist)

The `bundle.tar.xz` release artifact uploaded to GitHub contains the `/dist` folder, the `package.json` file and the `pnpm-lock.yaml` file. It only requires adding a `.env` file and installing the dependencies (`pnpm install --frozen-lockfile --prod`) to run the production build.

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
pnpm spell # check for spelling errors
pnpm clear # clear cache (turbo, vite, pnpm, esbuild, ...)
pnpm analyze # bundle size analysis
```

---

## TODO

- database
  - figure out migrations story
- cleanup bento
  - nice looking examples
