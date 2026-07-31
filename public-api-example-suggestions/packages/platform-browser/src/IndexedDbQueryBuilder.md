# Example Suggestions: `@effect/platform-browser/IndexedDbQueryBuilder`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts`
- **Uncovered API records:** 31
- **Priorities:** 0 required, 2 recommended, 28 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                  | Line | Kind                    | Priority        |
| ------------------------------------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryError`                 |   82 | `root-declaration`      | **recommended** |
| `@effect/platform-browser/IndexedDbQueryBuilder.make`                                | 2004 | `root-declaration`      | **recommended** |
| `@effect/platform-browser/IndexedDbQueryBuilder.ErrorReason`                         |   62 | `root-declaration`      | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryBuilder`               |  104 | `root-declaration`      | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.KeyPath`                             |  148 | `root-declaration`      | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.KeyPathNumber`                       |  158 | `root-declaration`      | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery`                      |  167 | `namespace`             | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.SelectType`           |  174 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyType`           |  187 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.EqualsType`           |  221 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType`     |  235 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyWithKey`        |  254 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.From`                 |  262 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Clear`                |  325 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Count`                |  339 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.DeletePartial`        |  384 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Delete`               |  434 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Delete.invalidate`    |  464 | `member`                | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select`               |  481 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select.stream`        |  553 | `member`                | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select.reactive`      |  568 | `member`                | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First`                |  590 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First.reactive`       |  609 | `member`                | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First.reactiveQueue`  |  624 | `member`                | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Filter`               |  639 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Modify`               |  662 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Modify.invalidate`    |  682 | `member`                | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll`            |  693 | `namespace-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll.invalidate` |  713 | `member`                | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbTransaction`                |  725 | `root-declaration`      | **optional**    |
| `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryError.ErrorTypeId`     |   93 | `member`                | **discouraged** |

## Recommended

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryError`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:82`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged error for IndexedDB query operations, carrying a query error reason and the original cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDbQueryBuilder } from "@effect/platform-browser"` and use `IndexedDbQueryBuilder.IndexedDbQueryError`.
- **Suggested snippet:** Create or capture `IndexedDbQueryBuilder.IndexedDbQueryError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/IndexedDbQueryBuilder.make`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:2004`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `IndexedDbQueryBuilder` from an open database reference, key-range constructor, table map, and reactivity service.
- **Signature hint:** `declare function make<Source extends IndexedDbVersion.AnyWithProps>({ IDBKeyRange, database, tables, reactivity }: { readonly database: MutableRef.MutableRef<globalThis.IDBDatabase>; readonly IDBKeyRange: typeof globalThis.IDBKeyRange; readonly tables: ReadonlyMap<string, IndexedDbVersion.Tables<Source>>; readonly reactivity: Reactivity.Reactivity['Service']; }): IndexedDbQueryBuilder<Source>`
- **Import guidance:** Start from `import { IndexedDbQueryBuilder } from "@effect/platform-browser"` and use `IndexedDbQueryBuilder.make`.
- **Suggested snippet:** Construct one representative value with `IndexedDbQueryBuilder.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/IndexedDbQueryBuilder.ErrorReason`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:62`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** String union describing IndexedDB query failure categories such as decoding, encoding, and transaction errors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.ErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryBuilder`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:104`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Typed query builder for an IndexedDB version, with helpers for table queries, database access, clearing data, and running effects in a shared transaction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryBuilder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.KeyPath`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:148`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Valid key-path type for a table schema, using encoded fields whose values are IndexedDB-valid keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.KeyPath`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.KeyPathNumber`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:158`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Valid numeric key-path type for a table schema, used for auto-increment key paths.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.KeyPathNumber`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:167`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing the typed IndexedDB query model interfaces and helper types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.SelectType`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:174`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded row type returned by select queries, adding a `key` field when the table does not define a key path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.SelectType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyType`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:187`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input type for insert and upsert operations, adjusted for auto-increment keys and out-of-line keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.EqualsType`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:221`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Value type accepted by `equals` comparisons for a table key path or index.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.EqualsType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:235`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Value type accepted by range comparisons for a table key path or index, including partial tuples for compound indexes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyWithKey`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:254`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Mutation input type for insert and upsert operations, including any required key fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyWithKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.From`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:262`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Query entry point for a table, exposing clear, select, count, delete, insert, and upsert operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.From`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Clear`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:325`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for clearing all rows from a table.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Clear`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Count`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:339`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for counting table rows, optionally constrained by an index and key-range comparisons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Count`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.DeletePartial`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:384`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Intermediate delete builder used to choose a key range or limit before producing an executable delete query.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.DeletePartial`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Delete`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:434`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for deleting rows from a table, with optional key-range, limit, filter, and reactivity invalidation helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Delete`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Delete.invalidate`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:464`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalidate any queries using Reactivity service with the provided keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Delete.invalidate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:481`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for selecting rows from a table, with chainable range, paging, filtering, streaming, and reactive query helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select.stream`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:553`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Stream the selected data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select.stream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select.reactive`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:568`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Use the Reactivity service to react to changes to the selected data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Select.reactive` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:590`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for selecting the first matching row, failing with `NoSuchElementError` when no row is found.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First.reactive`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:609`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Use the Reactivity service to react to changes to the selected data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First.reactive` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First.reactiveQueue`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:624`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Use the Reactivity service to react to changes to the selected data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.First.reactiveQueue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Filter`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:639`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for a select query filtered by one or more predicates over encoded table rows.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Filter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Modify`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:662`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for inserting or upserting one row, returning the resulting IndexedDB key and supporting reactivity invalidation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Modify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Modify.invalidate`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:682`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalidate any queries using Reactivity service with the provided keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.Modify.invalidate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:693`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect model for inserting or upserting multiple rows, returning the resulting IndexedDB keys and supporting reactivity invalidation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll.invalidate`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:713`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalidate any queries using Reactivity service with the provided keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll.invalidate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbTransaction`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:725`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service tag for the active `IDBTransaction` used to share a transaction across IndexedDB query effects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { IndexedDbQueryBuilder } from "@effect/platform-browser"` and use `IndexedDbQueryBuilder.IndexedDbTransaction`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `IndexedDbQueryBuilder.IndexedDbTransaction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryError.ErrorTypeId`

- **Source:** `packages/platform-browser/src/IndexedDbQueryBuilder.ts:93`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an IndexedDB query builder error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/platform-browser/IndexedDbQueryBuilder.IndexedDbQueryError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
