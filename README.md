# 🌳 Root
A fullstack typescript offline-first PWA template repo, ready to use
> [!TIP]
> **Quick start**: 
> Just click the <kbd>Use this template</kbd> button to create a new repository with this template.

> [!WARNING]
> **Don't forget to add an `.env` file**: 
> You can rename the `.env.example` file into `.env` for a minimal starting point that will be enough for the app to run

## Client Package

A typescript React application, with

- Vitest
- Vite
- SQLite (vlcn.io CRDTs) + useQuery hook for reactive queries
- Tanstack Query + useQuery hook for server<->client type-safety

## Server Package

A typescript Fastify server, with

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
- github actions (CI/CD) with auto-releases
- a `script` folder for build-time shared code (node only, for CI, vite plugins, ...)
- a `shared` folder for run-time shared code (all environments, for client, server, service worker, ...)

## Getting Started

To get started with this project, click on <kbd>Use this template</kbd> on GitHub (or clone the repository, but you will be missing the github config) and install the dependencies with pnpm:

```shell
pnpm install
```

To start the development server, run:

```shell
pnpm dev
```

In dev mode, all requests go through Vite's dev server, and all `/api` requests are forwarded to the Fastify server.

To test the project, run:

```shell
pnpm test
```

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

> [!TIP]
> **Easy deployment**: 
> The `bundle.tar.xz` release artifact uploaded to GitHub contains
> - the `/dist` folder,
> - the `package.json` file,
> - and the `pnpm-lock.yaml` file.
> 
> After unpacking,
> 1. provide your `.env` file,
> 2. install the runtime dependencies (`pnpm install --frozen-lockfile --prod`)
>
> And the app is ready to run.
> This allows you to use the GitHub webhooks to call your server and easily re-deploy on every version change.

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

- [ ] database: figure out migrations story
  - [ ] ~~maybe through drizzle?~~
    - not compatible with sqlite wasm (https://github.com/drizzle-team/drizzle-orm/issues/193, https://github.com/drizzle-team/drizzle-orm/discussions/243)
  - [ ] Manual migrations seem ok
    - do we want down migrations?
    - should migrations be separate from source code and be fetched? Or part of the source and the client simply cannot sync if the app is not up to date?
    - how do we know which migrations to run? (on the server, and on the client)
- [ ] cleanup bento: 
  - [ ] make the default page nicer looking
  - [ ] cleanup DB demo component
- [ ] docs: write docs w/ [fumadocs](https://fumadocs.vercel.app/) on [root-docs repo](https://github.com/Sheraff/root-docs)
- [ ] While working on CSS, ESLint can lose the types of `classes` objects. This might have been fixed by adding a tcm process to the `dev` command, but it needs to be tested.
