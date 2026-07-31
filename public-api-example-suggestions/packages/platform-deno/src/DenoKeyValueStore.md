# Example Suggestions: `@effect/platform-deno/DenoKeyValueStore`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoKeyValueStore.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoKeyValueStore.layerLocalStorage`   |   16 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoKeyValueStore.layerSessionStorage` |   26 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoKeyValueStore.layerLocalStorage`

- **Source:** `packages/platform-deno/src/DenoKeyValueStore.ts:16`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `KeyValueStore` layer backed by `localStorage`, with values stored between sessions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoKeyValueStore } from "@effect/platform-deno"` and use `DenoKeyValueStore.layerLocalStorage`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoKeyValueStore.layerLocalStorage`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoKeyValueStore.layerSessionStorage`

- **Source:** `packages/platform-deno/src/DenoKeyValueStore.ts:26`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `KeyValueStore` layer backed by `sessionStorage`, with values stored only for the current session.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoKeyValueStore } from "@effect/platform-deno"` and use `DenoKeyValueStore.layerSessionStorage`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoKeyValueStore.layerSessionStorage`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
