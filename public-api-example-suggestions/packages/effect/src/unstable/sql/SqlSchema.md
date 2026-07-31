# Example Suggestions: `effect/unstable/sql/SqlSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/SqlSchema.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 5 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                           | Line | Kind               | Priority        |
| --------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/sql/SqlSchema.findAll`       |   33 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlSchema.findNonEmpty`  |   65 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlSchema.void`          |  105 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlSchema.findOne`       |  115 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlSchema.findOneOption` |  148 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/sql/SqlSchema.findAll`

- **Source:** `packages/effect/src/unstable/sql/SqlSchema.ts:33`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a query function that encodes the request and decodes all result rows, allowing an empty result set.
- **Signature hint:** `declare function findAll<Req extends Schema.Constraint, Res extends Schema.Constraint, E, R>(options: { readonly Request: Req; readonly Result: Res; readonly execute: (request: Req['Encoded']) => Effect.Effect<ReadonlyArray<unknown>, E, R>; }): (request: Req['Type']) => Effect.Effect<Array<Res['Type']>, E | Schema.SchemaError, Req['EncodingServices'] | Res['DecodingServices'] | R>`
- **Import guidance:** Start from `import { SqlSchema } from "effect/unstable/sql"` and use `SqlSchema.findAll`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlSchema.findAll`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlSchema.findNonEmpty`

- **Source:** `packages/effect/src/unstable/sql/SqlSchema.ts:65`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a query function that encodes the request, decodes all result rows, and fails with `NoSuchElementError` when the result set is empty.
- **Signature hint:** `declare function findNonEmpty<Req extends Schema.Constraint, Res extends Schema.Constraint, E, R>(options: { readonly Request: Req; readonly Result: Res; readonly execute: (request: Req['Encoded']) => Effect.Effect<ReadonlyArray<unknown>, E, R>; }): (request: Req['Type']) => Effect.Effect<Arr.NonEmptyArray<Res['Type']>, E | Schema.SchemaError | Cause.NoSuchElementError, Req['EncodingServices'] | Res['DecodingServices'] | R>`
- **Import guidance:** Start from `import { SqlSchema } from "effect/unstable/sql"` and use `SqlSchema.findNonEmpty`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlSchema.findNonEmpty`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlSchema.void`

- **Source:** `packages/effect/src/unstable/sql/SqlSchema.ts:105`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Runs a sql query with a request schema and discard the result.
- **Signature hint:** `declare const _void: { <Req extends Schema.Constraint, E, R>(options: { readonly Request: Req; readonly execute: (request: Req['Encoded']) => Effect.Effect<unknown, E, R>; }): (request: Req['Type']) => Effect.Effect<void, E | Schema.SchemaError, R | Req['EncodingServices']>; } export { _void as void }`
- **Import guidance:** Start from `import { SqlSchema } from "effect/unstable/sql"` and use `SqlSchema.void`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs a sql query with a request schema and discard the result. Call `SqlSchema.void` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlSchema.findOne`

- **Source:** `packages/effect/src/unstable/sql/SqlSchema.ts:115`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a query function that encodes the request, decodes the first result row, and fails with `NoSuchElementError` when no rows are returned.
- **Signature hint:** `declare function findOne<Req extends Schema.Constraint, Res extends Schema.Constraint, E, R>(options: { readonly Request: Req; readonly Result: Res; readonly execute: (request: Req['Encoded']) => Effect.Effect<ReadonlyArray<unknown>, E, R>; }): (request: Req['Type']) => Effect.Effect<Res['Type'], E | Schema.SchemaError | Cause.NoSuchElementError, R | Req['EncodingServices'] | Res['DecodingServices']>`
- **Import guidance:** Start from `import { SqlSchema } from "effect/unstable/sql"` and use `SqlSchema.findOne`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlSchema.findOne`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlSchema.findOneOption`

- **Source:** `packages/effect/src/unstable/sql/SqlSchema.ts:148`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a query function that encodes the request, decodes the first result row as `Option.some`, and returns `Option.none` when no rows are returned.
- **Signature hint:** `declare function findOneOption<Req extends Schema.Constraint, Res extends Schema.Constraint, E, R>(options: { readonly Request: Req; readonly Result: Res; readonly execute: (request: Req['Encoded']) => Effect.Effect<ReadonlyArray<unknown>, E, R>; }): (request: Req['Type']) => Effect.Effect<Option.Option<Res['Type']>, E | Schema.SchemaError, R | Req['EncodingServices'] | Res['DecodingServices']>`
- **Import guidance:** Start from `import { SqlSchema } from "effect/unstable/sql"` and use `SqlSchema.findOneOption`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlSchema.findOneOption`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
