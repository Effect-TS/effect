# Example Suggestions: `effect/unstable/sql/SqlClient`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts`
- **Uncovered API records:** 17
- **Priorities:** 1 required, 3 recommended, 13 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind                    | Priority        |
| ------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/sql/SqlClient.makeWithTransaction`                 |  221 | `root-declaration`      | **required**    |
| `effect/unstable/sql/SqlClient.SqlClient`                           |   93 | `root-declaration`      | **recommended** |
| `effect/unstable/sql/SqlClient.make`                                |  138 | `root-declaration`      | **recommended** |
| `effect/unstable/sql/SqlClient.TransactionConnection`               |  327 | `root-declaration`      | **recommended** |
| `effect/unstable/sql/SqlClient.SafeIntegers`                        |  339 | `root-declaration`      | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient (type) (type)`             |   37 | `root-declaration`      | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient.safe`                      |   43 | `member`                | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient.withoutTransforms`         |   48 | `member`                | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient.withTransaction`           |   55 | `member`                | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient.transactionService`        |   62 | `member`                | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient.reactive`                  |   67 | `member`                | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient.reactiveMailbox`           |   76 | `member`                | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient (type) (type)`             |  100 | `namespace`             | **optional**    |
| `effect/unstable/sql/SqlClient.SqlClient.MakeOptions`               |  109 | `namespace-declaration` | **optional**    |
| `effect/unstable/sql/SqlClient.TransactionConnection (type) (type)` |  300 | `root-declaration`      | **optional**    |
| `effect/unstable/sql/SqlClient.TransactionConnection (type) (type)` |  309 | `namespace`             | **optional**    |
| `effect/unstable/sql/SqlClient.TransactionConnection.Service`       |  317 | `namespace-declaration` | **optional**    |

## Required

### `effect/unstable/sql/SqlClient.makeWithTransaction`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:221`
- **Kind / category:** `root-declaration` / `transactions`
- **Priority:** **required**
- **Current description:** Builds a transaction wrapper that begins top-level transactions, uses savepoints for nested transactions, commits on success, and rolls back on failure or interruption.
- **Signature hint:** `declare function makeWithTransaction<I, S>(options: { readonly transactionService: Context.Key<I, readonly [conn: S, counter: number]>; readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>; readonly acquireConnection: Effect.Effect<readonly [Scope.Closeable | undefined, S], SqlError>; readonly begin: (conn: NoInfer<S>) => Effect.Effect<void, SqlError>; readonly savepoint: (conn: NoInfer<S>, id: number) => Effect.Effect<void, SqlError>; readonly commit: (conn: NoInfer<S>) => Effect.Effect<void, SqlError>; readonly rollback: (conn: NoInfer<S>) => Effect.Effect<void, SqlError>; readonly rollbackSavepoint: (conn: NoInfer<S>, id: number) => Effect.Effect<void, SqlError>; }): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E | SqlError, R>`
- **Import guidance:** Start from `import { SqlClient } from "effect/unstable/sql"` and use `SqlClient.makeWithTransaction`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlClient.makeWithTransaction`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/sql/SqlClient.SqlClient`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:93`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the active SQL client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlClient } from "effect/unstable/sql"` and use `SqlClient.SqlClient`.
- **Suggested snippet:** Consume `SqlClient.SqlClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlClient.make`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:138`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs a `SqlClient` from connection acquirers, a compiler, transaction commands, tracing attributes, optional row transforms, and reactive query integration.
- **Signature hint:** `declare function make(options: SqlClient.MakeOptions): Effect.Effect<SqlClient, never, Reactivity>`
- **Import guidance:** Start from `import { SqlClient } from "effect/unstable/sql"` and use `SqlClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlClient.TransactionConnection`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:327`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Creates a unique context service tag for the active transaction connection of a specific SQL client.
- **Signature hint:** `declare function TransactionConnection(clientId: number): Context.Service<TransactionConnection, TransactionConnection.Service>`
- **Import guidance:** Start from `import { SqlClient } from "effect/unstable/sql"` and use `SqlClient.TransactionConnection`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a unique context service tag for the active transaction connection of a specific SQL client. Call `SqlClient.TransactionConnection` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/sql/SqlClient.SafeIntegers`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:339`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference used by SQL integrations to opt in to safe integer handling; defaults to `false`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlClient } from "effect/unstable/sql"` and use `SqlClient.SafeIntegers`.
- **Suggested snippet:** Consume `SqlClient.SafeIntegers` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient (type) (type)`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** SQL client service interface, combining the statement constructor API with connection reservation, transaction handling, and reactive query helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlClient.SqlClient (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient.safe`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:43`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Copy of the client for safeql etc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlClient.SqlClient.safe` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient.withoutTransforms`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:48`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Copy of the client without transformations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlClient.SqlClient.withoutTransforms` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient.withTransaction`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:55`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** With the given effect, ensure all sql queries are run in a transaction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlClient.SqlClient.withTransaction` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient.transactionService`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The transaction service for this client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlClient.SqlClient.transactionService` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient.reactive`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:67`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Use the Reactivity service to create a reactive query.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlClient.SqlClient.reactive` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient.reactiveMailbox`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:76`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Use the Reactivity service to create a reactive query.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/sql/SqlClient.SqlClient.reactiveMailbox` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient (type) (type)`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:100`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing types associated with the `SqlClient` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlClient.SqlClient (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.SqlClient.MakeOptions`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:109`
- **Kind / category:** `namespace-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options used to construct a `SqlClient`, including connection acquirers, the SQL compiler, transaction SQL, row transformation, tracing attributes, and optional reactive query integration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlClient.SqlClient.MakeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.TransactionConnection (type) (type)`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:300`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Phantom identifier for the scoped transaction connection service associated with a SQL client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlClient.TransactionConnection (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.TransactionConnection (type) (type)`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:309`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing types associated with transaction connection services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlClient.TransactionConnection (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlClient.TransactionConnection.Service`

- **Source:** `packages/effect/src/unstable/sql/SqlClient.ts:317`
- **Kind / category:** `namespace-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Service payload stored during a transaction, containing the active connection and nested transaction depth.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlClient.TransactionConnection.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
