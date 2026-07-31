# Example Suggestions: `effect/unstable/sql/SqlResolver`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 5 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/sql/SqlResolver.request`            |   59 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlResolver.ordered`            |  101 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlResolver.grouped`            |  149 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlResolver.findById`           |  218 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlResolver.void`               |  318 | `root-declaration` | **recommended** |
| `effect/unstable/sql/SqlResolver.SqlRequest (type)`  |   35 | `root-declaration` | **optional**    |
| `effect/unstable/sql/SqlResolver.SqlRequest (value)` |   82 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/sql/SqlResolver.request`

- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts:59`
- **Kind / category:** `root-declaration` / `requests`
- **Priority:** **recommended**
- **Current description:** Runs a payload as a `SqlRequest` through a request resolver, either directly with a payload and resolver or curried by resolver.
- **Signature hint:** `declare function request<In, A, E, R>(resolver: RequestResolver.RequestResolver<SqlRequest<In, A, E, R>>): (payload: In) => Effect.Effect<A, E | Schema.SchemaError, R> declare function request<In, A, E, R>(payload: In, resolver: RequestResolver.RequestResolver<SqlRequest<In, A, E, R>>): Effect.Effect<A, E | Schema.SchemaError, R>`
- **Import guidance:** Start from `import { SqlResolver } from "effect/unstable/sql"` and use `SqlResolver.request`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlResolver.request`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlResolver.ordered`

- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts:101`
- **Kind / category:** `root-declaration` / `resolvers`
- **Priority:** **recommended**
- **Current description:** Creates a resolver for a SQL query with a request schema and a result schema.
- **Signature hint:** `declare function ordered<Req extends Schema.Constraint, Res extends Schema.Constraint, _, E, R>(options: { readonly Request: Req; readonly Result: Res; readonly execute: (requests: Arr.NonEmptyArray<Req['Encoded']>) => Effect.Effect<ReadonlyArray<_>, E, R>; }): RequestResolver.RequestResolver<SqlRequest<Req['Type'], Res['Type'], E | ResultLengthMismatch, Req['EncodingServices'] | Res['DecodingServices'] | R>>`
- **Import guidance:** Start from `import { SqlResolver } from "effect/unstable/sql"` and use `SqlResolver.ordered`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a resolver for a SQL query with a request schema and a result schema. Call `SqlResolver.ordered` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlResolver.grouped`

- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts:149`
- **Kind / category:** `root-declaration` / `resolvers`
- **Priority:** **recommended**
- **Current description:** Creates a batched SQL request resolver that encodes requests, decodes result rows, groups decoded results by matching request and result keys, and fails a request with `NoSuchElementError` when no result group exists.
- **Signature hint:** `declare function grouped<Req extends Schema.Constraint, Res extends Schema.Constraint, K, Row, E, R>(options: { readonly Request: Req; readonly RequestGroupKey: (request: Req['Type']) => K; readonly Result: Res; readonly ResultGroupKey: (result: Res['Type'], row: Types.NoInfer<Row>) => K; readonly execute: (requests: Arr.NonEmptyArray<Req['Encoded']>) => Effect.Effect<ReadonlyArray<Row>, E, R>; }): RequestResolver.RequestResolver<SqlRequest<Req['Type'], Arr.NonEmptyArray<Res['Type']>, E | Schema.SchemaError | Cause.NoSuchElementError, Req['EncodingServices'] | Res['DecodingServices'] | R>>`
- **Import guidance:** Start from `import { SqlResolver } from "effect/unstable/sql"` and use `SqlResolver.grouped`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a batched SQL request resolver that encodes requests, decodes result rows, groups decoded results by matching request and result keys, and fails a request with `NoSuchElementError` when no result group exists. Call `SqlResolver.grouped` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlResolver.findById`

- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts:218`
- **Kind / category:** `root-declaration` / `resolvers`
- **Priority:** **recommended**
- **Current description:** Creates a batched resolver that fetches rows for encoded ids, decodes results, completes each matching request using `ResultId`, and fails missing ids with `NoSuchElementError`.
- **Signature hint:** `declare function findById<Id extends Schema.Constraint, Res extends Schema.Constraint, Row, E, R>(options: { readonly Id: Id; readonly Result: Res; readonly ResultId: (result: Res['Type'], row: Types.NoInfer<Row>) => Id['Type']; readonly execute: (requests: Arr.NonEmptyArray<Id['Encoded']>) => Effect.Effect<ReadonlyArray<Row>, E, R>; }): RequestResolver.RequestResolver<SqlRequest<Id['Type'], Res['Type'], E | Schema.SchemaError | Cause.NoSuchElementError, Id['EncodingServices'] | Res['DecodingServices'] | R>>`
- **Import guidance:** Start from `import { SqlResolver } from "effect/unstable/sql"` and use `SqlResolver.findById`.
- **Suggested snippet:** Create a small representative input, call `SqlResolver.findById`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/SqlResolver.void`

- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts:318`
- **Kind / category:** `root-declaration` / `resolvers`
- **Priority:** **recommended**
- **Current description:** Create a resolver that performs side effects.
- **Signature hint:** `declare const _void: { <Req extends Schema.Constraint, _, E, R>(options: { readonly Request: Req; readonly execute: (requests: Arr.NonEmptyArray<Req['Encoded']>) => Effect.Effect<ReadonlyArray<_>, E, R>; }): RequestResolver.RequestResolver<SqlRequest<Req['Type'], void, E | Schema.SchemaError, Req['EncodingServices'] | R>>; } export { _void as void }`
- **Import guidance:** Start from `import { SqlResolver } from "effect/unstable/sql"` and use `SqlResolver.void`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Create a resolver that performs side effects. Call `SqlResolver.void` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/sql/SqlResolver.SqlRequest (type)`

- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts:35`
- **Kind / category:** `root-declaration` / `requests`
- **Priority:** **optional**
- **Current description:** Request type used by SQL request resolvers, carrying the input payload together with the resolver's result, error, and environment types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/SqlResolver.SqlRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/SqlResolver.SqlRequest (value)`

- **Source:** `packages/effect/src/unstable/sql/SqlResolver.ts:82`
- **Kind / category:** `root-declaration` / `requests`
- **Priority:** **optional**
- **Current description:** Constructs a `SqlRequest` from a payload. Equality and hashing are based on the payload so equal requests can be batched and deduplicated.
- **Signature hint:** `declare function SqlRequest<In, A, E, R>(payload: In): SqlRequest<In, A, E, R>`
- **Import guidance:** Start from `import { SqlResolver } from "effect/unstable/sql"` and use `SqlResolver.SqlRequest`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a `SqlRequest` from a payload. Equality and hashing are based on the payload so equal requests can be batched and deduplicated. Call `SqlResolver.SqlRequest` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
