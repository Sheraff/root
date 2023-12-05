# Client Package

This is the client package of the project. It is a Progressive Web Application (PWA) built with React and Vite.

## Setup

To install the dependencies, run the following command in the root directory of the project:

```bash
pnpm install
```

## Development

To start the development server, run the following command in the root directory of the project:

```bash
pnpm dev --filter @project/client
```

The application will be available at `http://localhost:3000`.

## Testing

To run the tests, use the following command in the root directory of the project:

```bash
pnpm test --filter @project/client
```

## Build

To build the application for production, use the following command in the root directory of the project:

```bash
pnpm build --filter @project/client
```

The built files will be in the `dist` directory.

## Service Worker

The service worker is set up in the `src/service-worker.ts` file. It handles caching and offline functionality.

## Configuration

The configuration for Vite is in the `vite.config.ts` file. The configuration for TypeScript is in the `tsconfig.json` file. The configuration for Vitest is in the `vitest.config.ts` file.