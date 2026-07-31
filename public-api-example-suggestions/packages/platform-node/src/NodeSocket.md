# Example Suggestions: `@effect/platform-node/NodeSocket`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeSocket.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeSocket.layerWebSocket`              |   61 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeSocket.layerWebSocketConstructor`   |   31 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeSocket.layerWebSocketConstructorWS` |   47 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-node/NodeSocket.layerWebSocket`

- **Source:** `packages/platform-node/src/NodeSocket.ts:61`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `Socket.Socket` layer for a WebSocket URL using the Node WebSocket constructor layer, honoring protocol, open-timeout, and close-code error options.
- **Signature hint:** `declare function layerWebSocket(url: string | Effect.Effect<string>, options?: { readonly closeCodeIsError?: ((code: number) => boolean) | undefined; readonly openTimeout?: Duration.Input | undefined; readonly protocols?: string | Array<string> | undefined; } | undefined): Layer.Layer<Socket.Socket, never, never>`
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node"` and use `NodeSocket.layerWebSocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSocket.layerWebSocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node/NodeSocket.layerWebSocketConstructor`

- **Source:** `packages/platform-node/src/NodeSocket.ts:31`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides a `Socket.WebSocketConstructor`, using `globalThis.WebSocket` when available and falling back to the `ws` package otherwise.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node"` and use `NodeSocket.layerWebSocketConstructor`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSocket.layerWebSocketConstructor`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeSocket.layerWebSocketConstructorWS`

- **Source:** `packages/platform-node/src/NodeSocket.ts:47`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides a `Socket.WebSocketConstructor` backed explicitly by the `ws` package.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node"` and use `NodeSocket.layerWebSocketConstructorWS`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSocket.layerWebSocketConstructorWS`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
