# Example Suggestions: `effect/unstable/devtools/DevTools`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/devtools/DevTools.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/devtools/DevTools.layerSocket`    |   22 | `root-declaration` | **recommended** |
| `effect/unstable/devtools/DevTools.layerWebSocket` |   31 | `root-declaration` | **recommended** |
| `effect/unstable/devtools/DevTools.layer`          |   65 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/devtools/DevTools.layerSocket`

- **Source:** `packages/effect/src/unstable/devtools/DevTools.ts:22`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that installs the devtools tracer using an existing `Socket`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevTools } from "effect/unstable/devtools"` and use `DevTools.layerSocket`.
- **Suggested snippet:** Use the public setup or registry consumed by `DevTools.layerSocket`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/devtools/DevTools.layerWebSocket`

- **Source:** `packages/effect/src/unstable/devtools/DevTools.ts:31`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that installs the devtools tracer over a WebSocket connection to the specified URL, defaulting to `ws://localhost:34437`.
- **Signature hint:** `declare function layerWebSocket(url?: string): Layer.Layer<never, never, Socket.WebSocketConstructor>`
- **Import guidance:** Start from `import { DevTools } from "effect/unstable/devtools"` and use `DevTools.layerWebSocket`.
- **Suggested snippet:** Use the public setup or registry consumed by `DevTools.layerWebSocket`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/devtools/DevTools.layer`

- **Source:** `packages/effect/src/unstable/devtools/DevTools.ts:65`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that installs the devtools tracer over a WebSocket connection using the global WebSocket constructor, defaulting to `ws://localhost:34437`.
- **Signature hint:** `declare function layer(url?: string): Layer.Layer<never>`
- **Import guidance:** Start from `import { DevTools } from "effect/unstable/devtools"` and use `DevTools.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `DevTools.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
