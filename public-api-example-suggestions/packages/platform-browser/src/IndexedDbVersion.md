# Example Suggestions: `@effect/platform-browser/IndexedDbVersion`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 0 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                          | Line | Kind               | Priority     |
| ------------------------------------------------------------ | ---: | ------------------ | ------------ |
| `@effect/platform-browser/IndexedDbVersion.IndexedDbVersion` |   33 | `root-declaration` | **optional** |
| `@effect/platform-browser/IndexedDbVersion.make`             |  131 | `root-declaration` | **optional** |
| `@effect/platform-browser/IndexedDbVersion.Any`              |   47 | `root-declaration` | **optional** |
| `@effect/platform-browser/IndexedDbVersion.AnyWithProps`     |   57 | `root-declaration` | **optional** |
| `@effect/platform-browser/IndexedDbVersion.Tables`           |   65 | `root-declaration` | **optional** |
| `@effect/platform-browser/IndexedDbVersion.TableWithName`    |   73 | `root-declaration` | **optional** |
| `@effect/platform-browser/IndexedDbVersion.SchemaWithName`   |   84 | `root-declaration` | **optional** |

## Optional

### `@effect/platform-browser/IndexedDbVersion.IndexedDbVersion`

- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts:33`
- **Kind / category:** `root-declaration` / `interface`
- **Priority:** **optional**
- **Current description:** Typed IndexedDB version definition containing the tables available in that schema version.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbVersion.IndexedDbVersion`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbVersion.make`

- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts:131`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an `IndexedDbVersion` from one or more table definitions.
- **Signature hint:** `declare function make<const Tables extends NonEmptyReadonlyArray<IndexedDbTable.AnyWithProps>>(...tables: Tables): IndexedDbVersion<Tables[number]>`
- **Import guidance:** Start from `import { IndexedDbVersion } from "@effect/platform-browser"` and use `IndexedDbVersion.make`.
- **Suggested snippet:** Construct one representative value with `IndexedDbVersion.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbVersion.Any`

- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts:47`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased shape of an `IndexedDbVersion`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbVersion.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbVersion.AnyWithProps`

- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts:57`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased `IndexedDbVersion` retaining version properties with broad table types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbVersion.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbVersion.Tables`

- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts:65`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the table union from an `IndexedDbVersion`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbVersion.Tables`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbVersion.TableWithName`

- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts:73`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Selects a table by name from an `IndexedDbVersion`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbVersion.TableWithName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbVersion.SchemaWithName`

- **Source:** `packages/platform-browser/src/IndexedDbVersion.ts:84`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema for a named table within an `IndexedDbVersion`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbVersion.SchemaWithName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
