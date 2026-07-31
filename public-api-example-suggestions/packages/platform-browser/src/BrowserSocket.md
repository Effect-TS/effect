# Example Suggestions: `@effect/platform-browser/BrowserSocket`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserSocket.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-browser/BrowserSocket.layerWebSocket`            |   38 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserSocket.layerWebSocketConstructor` |   51 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-browser/BrowserSocket.layerWebSocket`

- **Source:** `packages/platform-browser/src/BrowserSocket.ts:38`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `Socket` layer connected to the given URL using the browser `WebSocket` constructor.
- **Signature hint:** `declare function layerWebSocket(url: string, options?: { readonly closeCodeIsError?: (code: number) => boolean; }): Layer.Layer<Socket.Socket>`
- **Import guidance:** Start from `import { BrowserSocket } from "@effect/platform-browser"` and use `BrowserSocket.layerWebSocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserSocket.layerWebSocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserSocket.layerWebSocketConstructor`

- **Source:** `packages/platform-browser/src/BrowserSocket.ts:51`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a `WebSocketConstructor` service backed by `globalThis.WebSocket`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserSocket } from "@effect/platform-browser"` and use `BrowserSocket.layerWebSocketConstructor`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserSocket.layerWebSocketConstructor`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
