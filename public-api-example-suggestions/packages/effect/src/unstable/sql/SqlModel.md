# Example Suggestions: `effect/unstable/sql/SqlModel`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/SqlModel.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                           | Line | Kind               | Priority        |
| --------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/sql/SqlModel.makeResolvers`  |  230 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlModel.makeRepository` |   33 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/sql/SqlModel.makeResolvers`

- **Source:** `packages/effect/src/unstable/sql/SqlModel.ts:230`
- **Kind / category:** `root-declaration` / `repository`
- **Priority:** **recommended**
- **Current description:** Creates batched request resolvers for a schema model's insert, insert-void, find-by-id, and delete operations, honoring the optional soft-delete column.
- **Signature hint:** `declare function makeResolvers<S extends Model.Any, Id extends (keyof S['Type']) & (keyof S['update']['Type']) & (keyof S['fields']), SoftDelete extends keyof S['fields'] = never>(Model: S, options: { readonly tableName: string; readonly spanPrefix: string; readonly idColumn: Id; readonly softDeleteColumn?: SoftDelete | undefined; }): Effect.Effect<{ readonly insert: RequestResolver.RequestResolver<SqlResolver.SqlRequest<S['insert']['Type'], S['Type'], ResultLengthMismatch | SqlError, S['insert']['EncodingServices']>>; readonly insertVoid: RequestResolver.RequestResolver<SqlResolver.SqlRequest<S['insert']['Type'], void, SqlError, S['insert']['EncodingServices']>>; readonly findById: RequestResolver.RequestResolver<SqlResolver.SqlRequest<S['fields'][Id]['Type'], S['Type'], Cause.NoSuchElementError | SqlError, S['DecodingServices'] | S['fields'][Id]['EncodingServices']>>; readonly delete: RequestResolver.RequestResolver<SqlResolver.SqlRequest<S['fields'][Id]['Type'], void, SqlError, S['fields'][Id]['EncodingServices']>>; }, never, SqlClient | Scope>`
- **Import guidance:** Start from `import { SqlModel } from "effect/unstable/sql"` and use `SqlModel.makeResolvers`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlModel.makeResolvers`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlModel.makeRepository`

- **Source:** `packages/effect/src/unstable/sql/SqlModel.ts:33`
- **Kind / category:** `root-declaration` / `repository`
- **Priority:** **recommended**
- **Current description:** Creates a CRUD repository for a schema model backed by a SQL table, with insert, update, find-by-id, and delete operations. When `softDeleteColumn` is supplied, reads ignore soft-deleted rows and delete updates that column instead of removing the row.
- **Signature hint:** `declare function makeRepository<S extends Model.Any, Id extends (keyof S['Type']) & (keyof S['update']['Type']) & (keyof S['fields']), SoftDelete extends keyof S['fields'] = never>(Model: S, options: { readonly tableName: string; readonly spanPrefix: string; readonly idColumn: Id; readonly softDeleteColumn?: SoftDelete | undefined; }): Effect.Effect<{ readonly insert: (insert: S['insert']['Type']) => Effect.Effect<S['Type'], Schema.SchemaError | SqlError, S['DecodingServices'] | S['insert']['EncodingServices']>; readonly insertVoid: (insert: S['insert']['Type']) => Effect.Effect<void, Schema.SchemaError | SqlError, S['insert']['EncodingServices']>; readonly update: (update: S['update']['Type']) => Effect.Effect<S['Type'], Schema.SchemaError | SqlError, S['DecodingServices'] | S['update']['EncodingServices']>; readonly updateVoid: (update: S['update']['Type']) => Effect.Effect<void, Schema.SchemaError | SqlError, S['update']['EncodingServices']>; readonly findById: (id: S['fields'][Id]['Type']) => Effect.Effect<S['Type'], Cause.NoSuchElementError | Schema.SchemaError | SqlError, S['DecodingServices'] | S['fields'][Id]['EncodingServices']>; readonly delete: (id: S['fields'][Id]['Type']) => Effect.Effect<void, Schema.SchemaError | SqlError, S['fields'][Id]['EncodingServices']>; }, never, SqlClient>`
- **Import guidance:** Start from `import { SqlModel } from "effect/unstable/sql"` and use `SqlModel.makeRepository`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlModel.makeRepository`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
