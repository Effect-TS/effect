# Example Suggestions: `@effect/platform-node/NodeHttpServerRequest`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeHttpServerRequest.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority     |
| --------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/platform-node/NodeHttpServerRequest.toIncomingMessage` |   20 | `root-declaration` | **optional** |
| `@effect/platform-node/NodeHttpServerRequest.toServerResponse`  |   30 | `root-declaration` | **optional** |

## Optional

### `@effect/platform-node/NodeHttpServerRequest.toIncomingMessage`

- **Source:** `packages/platform-node/src/NodeHttpServerRequest.ts:20`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **optional**
- **Current description:** Returns the underlying Node `IncomingMessage` for a platform Node `HttpServerRequest`.
- **Signature hint:** `declare function toIncomingMessage(self: HttpServerRequest): Http.IncomingMessage`
- **Import guidance:** Start from `import { NodeHttpServerRequest } from "@effect/platform-node"` and use `NodeHttpServerRequest.toIncomingMessage`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `NodeHttpServerRequest.toIncomingMessage`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpServerRequest.toServerResponse`

- **Source:** `packages/platform-node/src/NodeHttpServerRequest.ts:30`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **optional**
- **Current description:** Returns the underlying Node `ServerResponse` for a platform Node `HttpServerRequest`, evaluating the stored response thunk when the response was created lazily.
- **Signature hint:** `declare function toServerResponse(self: HttpServerRequest): Http.ServerResponse`
- **Import guidance:** Start from `import { NodeHttpServerRequest } from "@effect/platform-node"` and use `NodeHttpServerRequest.toServerResponse`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `NodeHttpServerRequest.toServerResponse`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
