# Example Suggestions: `@effect/platform-browser/IndexedDbTable`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/IndexedDbTable.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 1 recommended, 12 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/IndexedDbTable.make`            |  195 | `root-declaration` | **recommended** |
| `@effect/platform-browser/IndexedDbTable.IndexedDbTable`  |   29 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.AnySchemaStruct` |   58 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.Any`             |   68 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.AnyWithProps`    |   86 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.TableName`       |  100 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.KeyPath`         |  107 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.AutoIncrement`   |  115 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.TableSchema`     |  123 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.Context`         |  130 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.Encoded`         |  140 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.Indexes`         |  148 | `root-declaration` | **optional**    |
| `@effect/platform-browser/IndexedDbTable.WithName`        |  156 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-browser/IndexedDbTable.make`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:195`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a typed IndexedDB table definition from its name, schema, optional key path, indexes, auto-increment flag, and durability.
- **Signature hint:** `declare function make<const Name extends string, TableSchema extends AnySchemaStruct, const Indexes extends Record<string, IndexedDbQueryBuilder.KeyPath<TableSchema>>, const KeyPath extends (AutoIncrement extends true ? IndexedDbQueryBuilder.KeyPathNumber<NoInfer<TableSchema>> : IndexedDbQueryBuilder.KeyPath<NoInfer<TableSchema>>) | undefined = undefined, const AutoIncrement extends boolean = false>(options: { readonly name: Name; readonly schema: [KeyPath] extends [undefined] ? 'key' extends keyof TableSchema['fields'] ? 'Cannot have a \'key\' field when keyPath is undefined' : TableSchema : TableSchema; readonly keyPath?: KeyPath; readonly indexes?: Indexes | undefined; readonly autoIncrement?: IsValidAutoIncrementKeyPath<TableSchema, KeyPath> extends true ? AutoIncrement | undefined : never; readonly durability?: IDBTransactionDurability | undefined; }): IndexedDbTable<Name, TableSchema, Indexes, Extract<KeyPath, Readonly<IDBValidKey | undefined>>, AutoIncrement>`
- **Import guidance:** Start from `import { IndexedDbTable } from "@effect/platform-browser"` and use `IndexedDbTable.make`.
- **Suggested snippet:** Construct one representative value with `IndexedDbTable.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/IndexedDbTable.IndexedDbTable`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:29`
- **Kind / category:** `root-declaration` / `interface`
- **Priority:** **optional**
- **Current description:** Typed IndexedDB table definition containing its name, schema, key path, indexes, auto-increment setting, and transaction durability.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.IndexedDbTable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.AnySchemaStruct`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:58`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema constraint for table schemas that expose struct fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.AnySchemaStruct`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.Any`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased shape of an `IndexedDbTable` used when table type parameters are not needed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.AnyWithProps`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:86`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased `IndexedDbTable` retaining the table interface properties with broad type parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.TableName`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:100`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the table name type from an `IndexedDbTable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.TableName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.KeyPath`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:107`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the key-path type from an `IndexedDbTable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.KeyPath`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.AutoIncrement`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:115`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the auto-increment flag type from an `IndexedDbTable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.AutoIncrement`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.TableSchema`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:123`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema type from an `IndexedDbTable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.TableSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.Context`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:130`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoding or encoding service requirements needed by an `IndexedDbTable` schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.Context`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.Encoded`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:140`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the encoded row type from an `IndexedDbTable` schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.Indexes`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:148`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the index definition map from an `IndexedDbTable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.Indexes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/IndexedDbTable.WithName`

- **Source:** `packages/platform-browser/src/IndexedDbTable.ts:156`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Selects the table with the given name from a union of `IndexedDbTable` types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/IndexedDbTable.WithName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
