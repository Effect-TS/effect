# Example Suggestions: `effect/unstable/persistence/KeyValueStore`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts`
- **Uncovered API records:** 46
- **Priorities:** 0 required, 7 recommended, 38 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                        | Line | Kind               | Priority        |
| -------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/persistence/KeyValueStore.layerFileSystem`                |  354 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/KeyValueStore.layerSql`                       |  495 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/KeyValueStore.layerStorage`                   |  825 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/KeyValueStore.KeyValueStoreError`             |  183 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore (value)`          |  208 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/KeyValueStore.prefix`                         |  297 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/KeyValueStore.toSchemaStore`                  |  768 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/KeyValueStore.LayerSqlOptions`                |  475 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore`                    |  707 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeOptions`                    |  108 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeStringOptions`              |  147 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.make`                           |  224 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.makeStringOnly`                 |  268 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.layerMemory`                    |  317 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore (type)`           |   38 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.get`              |   43 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.getUint8Array`    |   48 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.set`              |   53 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.remove`           |   58 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.clear`            |   63 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.size`             |   68 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.modify`           |   73 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.modifyUint8Array` |   81 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.has`              |   89 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStore.isEmpty`          |   94 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeOptions.get`                |  112 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeOptions.getUint8Array`      |  117 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeOptions.set`                |  122 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeOptions.remove`             |  127 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeOptions.clear`              |  132 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeOptions.size`               |  137 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeStringOptions.get`          |  151 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeStringOptions.set`          |  156 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeStringOptions.remove`       |  161 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeStringOptions.clear`        |  166 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.MakeStringOptions.size`         |  171 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.LayerSqlOptions.table`          |  481 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.get`                |  712 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.set`                |  719 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.remove`             |  727 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.clear`              |  732 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.size`               |  737 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.modify`             |  742 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.has`                |  754 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.SchemaStore.isEmpty`            |  759 | `member`           | **optional**    |
| `effect/unstable/persistence/KeyValueStore.KeyValueStoreError.ErrorTypeId` |  194 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/persistence/KeyValueStore.layerFileSystem`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:354`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a `KeyValueStore` backed by files in the specified directory.
- **Signature hint:** `declare function layerFileSystem(directory: string): Layer.Layer<KeyValueStore, PlatformError, FileSystem.FileSystem | Path.Path>`
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.layerFileSystem`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `KeyValueStore.layerFileSystem`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/KeyValueStore.layerSql`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:495`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a SQL-backed `KeyValueStore`.
- **Signature hint:** `declare function layerSql(options?: LayerSqlOptions): Layer.Layer<KeyValueStore, never, SqlClient.SqlClient>`
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.layerSql`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `KeyValueStore.layerSql`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/KeyValueStore.layerStorage`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:825`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a `KeyValueStore` backed by a Web `Storage` instance such as `localStorage` or `sessionStorage`.
- **Signature hint:** `declare function layerStorage(evaluate: LazyArg<Storage>): Layer.Layer<KeyValueStore>`
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.layerStorage`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `KeyValueStore.layerStorage`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/KeyValueStore.KeyValueStoreError`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:183`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by key/value store operations, including the failed method, optional key, message, and cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.KeyValueStoreError`.
- **Suggested snippet:** Create or capture `KeyValueStore.KeyValueStoreError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore (value)`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:208`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for string and binary key/value storage.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.KeyValueStore`.
- **Suggested snippet:** Consume `KeyValueStore.KeyValueStore` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/KeyValueStore.prefix`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:297`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a view of a `KeyValueStore` that prepends the given prefix to every key.
- **Signature hint:** `declare function prefix(prefix: string): (self: KeyValueStore) => KeyValueStore declare function prefix(self: KeyValueStore, prefix: string): KeyValueStore`
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.prefix`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a view of a `KeyValueStore` that prepends the given prefix to every key. Call `KeyValueStore.prefix` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/KeyValueStore.toSchemaStore`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:768`
- **Kind / category:** `root-declaration` / `SchemaStore`
- **Priority:** **recommended**
- **Current description:** Adapts a `KeyValueStore` into a `SchemaStore` using the schema's JSON codec.
- **Signature hint:** `declare function toSchemaStore<S extends Schema.Constraint>(self: KeyValueStore, schema: S): SchemaStore<S>`
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.toSchemaStore`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `KeyValueStore.toSchemaStore`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/persistence/KeyValueStore.LayerSqlOptions`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:475`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Options for configuring the SQL-backed `KeyValueStore` layer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/KeyValueStore.LayerSqlOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:707`
- **Kind / category:** `root-declaration` / `SchemaStore`
- **Priority:** **optional**
- **Current description:** Schema-aware view of a `KeyValueStore` that stores values as encoded JSON.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/KeyValueStore.SchemaStore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeOptions`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:108`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Implementation callbacks used by `make` to construct a `KeyValueStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/KeyValueStore.MakeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeStringOptions`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:147`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Implementation callbacks for adapting a string-only backing store into a `KeyValueStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/KeyValueStore.MakeStringOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.make`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:224`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a `KeyValueStore` from primitive store operations.
- **Signature hint:** `declare function make(options: MakeOptions): KeyValueStore`
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.make`.
- **Suggested snippet:** Construct one representative value with `KeyValueStore.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.makeStringOnly`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:268`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Adapts a string-only backing store into a `KeyValueStore`.
- **Signature hint:** `declare function makeStringOnly(options: MakeStringOptions): KeyValueStore`
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.makeStringOnly`.
- **Suggested snippet:** Construct one representative value with `KeyValueStore.makeStringOnly`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.layerMemory`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:317`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides a process-local in-memory `KeyValueStore` backed by a `Map`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { KeyValueStore } from "effect/unstable/persistence"` and use `KeyValueStore.layerMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `KeyValueStore.layerMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore (type)`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:38`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effectful key/value store service for string and binary values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/KeyValueStore.KeyValueStore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.get`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:43`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.get` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.getUint8Array`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:48`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.getUint8Array` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.set`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:53`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Sets the value of the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.set` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.remove`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:58`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.remove` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.clear`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:63`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes all entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.clear` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.size`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:68`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the number of entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.size` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.modify`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Updates the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.modify` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.modifyUint8Array`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:81`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Updates the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.modifyUint8Array` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.has`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:89`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns true if the KeyValueStore contains the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.has` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.KeyValueStore.isEmpty`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Checks whether the KeyValueStore contains any entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.KeyValueStore.isEmpty` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeOptions.get`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:112`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeOptions.get` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeOptions.getUint8Array`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:117`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeOptions.getUint8Array` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeOptions.set`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:122`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Sets the value of the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeOptions.set` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeOptions.remove`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:127`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeOptions.remove` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeOptions.clear`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:132`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes all entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeOptions.clear` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeOptions.size`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:137`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the number of entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeOptions.size` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeStringOptions.get`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:151`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeStringOptions.get` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeStringOptions.set`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:156`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Sets the value of the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeStringOptions.set` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeStringOptions.remove`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:161`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeStringOptions.remove` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeStringOptions.clear`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes all entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeStringOptions.clear` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.MakeStringOptions.size`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:171`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the number of entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.MakeStringOptions.size` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.LayerSqlOptions.table`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:481`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The SQL table name used to store values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.LayerSqlOptions.table` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.get`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:712`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.get` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.set`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:719`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Sets the value of the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.set` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.remove`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:727`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.remove` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.clear`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:732`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Removes all entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.clear` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.size`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:737`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the number of entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.size` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.modify`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:742`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Updates the value of the specified key if it exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.modify` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.has`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:754`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns true if the KeyValueStore contains the specified key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.has` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/KeyValueStore.SchemaStore.isEmpty`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:759`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Checks whether the KeyValueStore contains any entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/KeyValueStore.SchemaStore.isEmpty` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/persistence/KeyValueStore.KeyValueStoreError.ErrorTypeId`

- **Source:** `packages/effect/src/unstable/persistence/KeyValueStore.ts:194`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a key-value store error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/KeyValueStore.KeyValueStoreError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
