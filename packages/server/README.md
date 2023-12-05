# Server Package

This is the server package for our fullstack TypeScript project. It uses Fastify to serve our client package and custom API routes.

## Getting Started

To get started with this package, navigate to the server directory and install the dependencies:

```bash
cd packages/server
pnpm install
```

## Running the Server

To start the server, use the following command:

```bash
pnpm run start
```

This will start the Fastify server, serving the client package and the custom API routes.

## Testing

This package uses Vitest for testing. To run the tests, use the following command:

```bash
pnpm run test
```

## API Routes

The API routes are defined in the `src/api/index.ts` file. You can add more routes by creating new files in the `src/api` directory and importing them in the `index.ts` file.

## Contributing

If you want to contribute to this package, please make sure to follow the existing coding style and add tests for new features.