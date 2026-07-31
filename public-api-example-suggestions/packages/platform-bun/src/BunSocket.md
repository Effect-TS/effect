# Example Suggestions: `@effect/platform-bun/BunSocket`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunSocket.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunSocket.layerWebSocket`            |   43 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunSocket.layerWebSocketConstructor` |   29 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-bun/BunSocket.layerWebSocket`

- **Source:** `packages/platform-bun/src/BunSocket.ts:43`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `Socket.Socket` layer for a WebSocket URL using Bun's global `WebSocket` constructor, honoring protocol, open-timeout, and close-code error options.
- **Signature hint:** `declare function layerWebSocket(url: string | Effect<string>, options?: { readonly closeCodeIsError?: ((code: number) => boolean) | undefined; readonly openTimeout?: Duration.Input | undefined; readonly protocols?: string | Array<string> | undefined; } | undefined): Layer.Layer<Socket.Socket, never, never>`
- **Import guidance:** Start from `import { BunSocket } from "@effect/platform-bun"` and use `BunSocket.layerWebSocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunSocket.layerWebSocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-bun/BunSocket.layerWebSocketConstructor`

- **Source:** `packages/platform-bun/src/BunSocket.ts:29`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides a `Socket.WebSocketConstructor` backed by Bun's global `WebSocket` implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunSocket } from "@effect/platform-bun"` and use `BunSocket.layerWebSocketConstructor`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunSocket.layerWebSocketConstructor`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
