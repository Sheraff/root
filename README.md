# Fullstack TypeScript Project

## TODO

- env
- finish auth
  - turn sessions into actual accounts
  - better utils for "protected" stuff (client & server)
- vlcn.io

## Client Package

A typescript React application, with

- PWA & service worker
- Vitest
- Vite

## Server Package

A typescript Fastify server, with

- sqlite database
- vlcn.io CRDT server (TODO)
- esbuild
- Vitest
- oauth through 3rd party providers

## Root Level

A workspace, with

- pnpm
- eslint
- prettier
- tsconfig

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

To test the project, run:

```shell
pnpm test
```

For more information, refer to the README files in the individual packages.
