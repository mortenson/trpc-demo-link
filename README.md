# trpc-demo-link

An example repository that shows how you can use tRPC client links
to mock your tRPC API and build product demos without changing your app/components.

The interesting parts of the codebase are:

- The tRPC client link that mocks HTTP responses if the user is on a certain URL in the frontend: [./client/src/utils/demoLink.ts](./client/src/utils/demoLink.ts)
- The definitions for how routes are mocked and mock data is stored: [./client/src/utils/demoRoutes.ts](./client/src/utils/demoRoutes.ts)

## Running locally

```bash
npm i
npm run dev
```

Note: hard forked from https://github.com/trpc/examples-minimal-react
