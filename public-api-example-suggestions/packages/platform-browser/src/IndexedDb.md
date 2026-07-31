# Example Suggestions: `@effect/platform-browser/IndexedDb`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/IndexedDb.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 5 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-browser/IndexedDb.layerWindow`       |   99 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDb.IndexedDb (value)` |   37 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDb.IDBValidKey`       |   57 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDb.AutoIncrement`     |   77 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDb.make`              |   91 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDb.IndexedDb (type)`  |   25 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-browser/IndexedDb.layerWindow`

- **Source:** `packages/platform-browser/src/IndexedDb.ts:99`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Layer that provides `IndexedDb` from `window.indexedDB` and `window.IDBKeyRange`, failing with a config error when they are unavailable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDb } from "@effect/platform-browser"` and use `IndexedDb.layerWindow`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `IndexedDb.layerWindow`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/IndexedDb.IndexedDb (value)`

- **Source:** `packages/platform-browser/src/IndexedDb.ts:37`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for browser IndexedDB primitives.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDb } from "@effect/platform-browser"` and use `IndexedDb.IndexedDb`.
- **Suggested snippet:** Consume `IndexedDb.IndexedDb` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/IndexedDb.IDBValidKey`

- **Source:** `packages/platform-browser/src/IndexedDb.ts:57`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for IndexedDB keys: strings, non-NaN numbers, valid dates, buffer sources, or arrays of those flat key values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDb } from "@effect/platform-browser"` and use `IndexedDb.IDBValidKey`.
- **Suggested snippet:** Use `IndexedDb.IDBValidKey` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/IndexedDb.AutoIncrement`

- **Source:** `packages/platform-browser/src/IndexedDb.ts:77`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for auto-incremented IndexedDB keys, accepting integers from 1 through `2 ** 53`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDb } from "@effect/platform-browser"` and use `IndexedDb.AutoIncrement`.
- **Suggested snippet:** Use `IndexedDb.AutoIncrement` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/IndexedDb.make`

- **Source:** `packages/platform-browser/src/IndexedDb.ts:91`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `IndexedDb` service from an `IDBFactory` and `IDBKeyRange` constructor.
- **Signature hint:** `declare function make(impl: Omit<IndexedDb, typeof TypeId>): IndexedDb`
- **Import guidance:** Start from `import { IndexedDb } from "@effect/platform-browser"` and use `IndexedDb.make`.
- **Suggested snippet:** Construct one representative value with `IndexedDb.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/IndexedDb.IndexedDb (type)`

- **Source:** `packages/platform-browser/src/IndexedDb.ts:25`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service interface that provides the browser `indexedDB` factory and `IDBKeyRange` constructor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDb.IndexedDb`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
