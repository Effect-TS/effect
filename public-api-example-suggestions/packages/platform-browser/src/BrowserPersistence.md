# Example Suggestions: `@effect/platform-browser/BrowserPersistence`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserPersistence.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind               | Priority        |
| ------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/BrowserPersistence.layerBackingIndexedDb` |   44 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserPersistence.layerIndexedDb`        |   79 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-browser/BrowserPersistence.layerBackingIndexedDb`

- **Source:** `packages/platform-browser/src/BrowserPersistence.ts:44`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `BackingPersistence` layer backed by IndexedDB, optionally using the provided database name.
- **Signature hint:** `declare function layerBackingIndexedDb(options?: { readonly database?: string | undefined; }): Layer.Layer<Persistence.BackingPersistence>`
- **Import guidance:** Start from `import { BrowserPersistence } from "@effect/platform-browser"` and use `BrowserPersistence.layerBackingIndexedDb`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserPersistence.layerBackingIndexedDb`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserPersistence.layerIndexedDb`

- **Source:** `packages/platform-browser/src/BrowserPersistence.ts:79`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `Persistence` layer backed by IndexedDB, optionally using the provided database name.
- **Signature hint:** `declare function layerIndexedDb(options?: { readonly database?: string | undefined; }): Layer.Layer<Persistence.Persistence>`
- **Import guidance:** Start from `import { BrowserPersistence } from "@effect/platform-browser"` and use `BrowserPersistence.layerIndexedDb`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserPersistence.layerIndexedDb`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
