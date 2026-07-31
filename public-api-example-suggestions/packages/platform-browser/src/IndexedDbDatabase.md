# Example Suggestions: `@effect/platform-browser/IndexedDbDatabase`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 2 recommended, 8 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                             | Line | Kind               | Priority        |
| ------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/IndexedDbDatabase.IndexedDbDatabaseError`             |   92 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDbDatabase.make`                               |  293 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDbDatabase.ErrorReason`                        |   77 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.IndexedDbDatabase`                  |  132 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.IndexedDbSchema`                    |  148 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.Transaction`                        |  201 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.IndexFromTable`                     |  240 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.IndexFromTableName`                 |  251 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.Any`                                |  264 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.AnySchema`                          |  281 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbDatabase.IndexedDbDatabaseError.ErrorTypeId` |  103 | `member`           | **discouraged** |

## Recommended

### `@effect/platform-browser/IndexedDbDatabase.IndexedDbDatabaseError`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:92`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged error for IndexedDB database operations, carrying a database error reason and the original cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDbDatabase } from "@effect/platform-browser"` and use `IndexedDbDatabase.IndexedDbDatabaseError`.
- **Suggested snippet:** Create or capture `IndexedDbDatabase.IndexedDbDatabaseError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/IndexedDbDatabase.make`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:293`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates the initial `IndexedDbSchema` from a version and an initialization migration run during database upgrade.
- **Signature hint:** `declare function make<InitialVersion extends IndexedDbVersion.AnyWithProps, Error>(initialVersion: InitialVersion, init: (toQuery: Transaction<InitialVersion>) => Effect.Effect<void, Error>): IndexedDbSchema<never, InitialVersion, Error>`
- **Import guidance:** Start from `import { IndexedDbDatabase } from "@effect/platform-browser"` and use `IndexedDbDatabase.make`.
- **Suggested snippet:** Construct one representative value with `IndexedDbDatabase.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/IndexedDbDatabase.ErrorReason`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:77`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** String union describing the failure categories for IndexedDB database opening, migration, and schema operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbDatabase.ErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbDatabase.IndexedDbDatabase`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:132`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service tag for an open IndexedDB database, its `IDBKeyRange` constructor, reactivity service, and rebuild effect.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDbDatabase } from "@effect/platform-browser"` and use `IndexedDbDatabase.IndexedDbDatabase`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `IndexedDbDatabase.IndexedDbDatabase`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbDatabase.IndexedDbSchema`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:148`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes an IndexedDB schema version and its migrations, and acts as an effect that yields a query builder for the target version.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbDatabase.IndexedDbSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbDatabase.Transaction`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:201`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Query builder available during a database migration, extended with object-store and index management helpers for the active `IDBTransaction`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbDatabase.Transaction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbDatabase.IndexFromTable`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:240`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the string-literal index names defined by an `IndexedDbTable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbDatabase.IndexFromTable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbDatabase.IndexFromTableName`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:251`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the valid index names for a table name within an IndexedDB version.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbDatabase.IndexFromTableName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbDatabase.Any`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:264`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased IndexedDB schema shape used when traversing schema migration chains.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbDatabase.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbDatabase.AnySchema`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:281`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased `IndexedDbSchema` covering any source version, target version, and migration error type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbDatabase.AnySchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/platform-browser/IndexedDbDatabase.IndexedDbDatabaseError.ErrorTypeId`

- **Source:** `packages/platform-browser/src/IndexedDbDatabase.ts:103`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an IndexedDB database error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/platform-browser/IndexedDbDatabase.IndexedDbDatabaseError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
