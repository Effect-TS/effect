# Example Suggestions: `effect/Array`

- **Package:** `effect`
- **Source:** `packages/effect/src/Array.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 2 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                     | Line | Kind               | Priority        |
| --------------------------------------- | ---: | ------------------ | --------------- |
| `effect/Array.takeWhileFilter`          | 1397 | `root-declaration` | **recommended** |
| `effect/Array.dropWhileFilter`          | 1601 | `root-declaration` | **recommended** |
| `effect/Array.getReadonlyReducerConcat` | 4902 | `root-declaration` | **optional**    |
| `effect/Array.makeReducerConcat`        | 4914 | `root-declaration` | **optional**    |
| `effect/Array.ReadonlyArrayTypeLambda`  |   58 | `root-declaration` | **optional**    |
| `effect/Array.ReadonlyArray`            | 3414 | `namespace`        | **optional**    |

## Recommended

### `effect/Array.takeWhileFilter`

- **Source:** `packages/effect/src/Array.ts:1397`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Takes elements from the start while a `Filter` succeeds, collecting transformed values.
- **Signature hint:** `declare function takeWhileFilter<A, B, X>(f: (input: NoInfer<A>, i: number) => Result.Result<B, X>): (self: Iterable<A>) => Array<B> declare function takeWhileFilter<A, B, X>(self: Iterable<A>, f: (input: NoInfer<A>, i: number) => Result.Result<B, X>): Array<B>`
- **Import guidance:** Start from `import { Array } from "effect"` and use `Array.takeWhileFilter`.
- **Suggested snippet:** Use a callback that succeeds for initial values and fails at one clear boundary, apply `Array.takeWhileFilter`, and assert the resulting collection so the take/drop boundary is visible. The callback's `Result` is control flow, not the API output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Array.dropWhileFilter`

- **Source:** `packages/effect/src/Array.ts:1601`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Drops elements from the start while a `Filter` succeeds.
- **Signature hint:** `declare function dropWhileFilter<A, B, X>(f: (input: NoInfer<A>, i: number) => Result.Result<B, X>): (self: Iterable<A>) => Array<A> declare function dropWhileFilter<A, B, X>(self: Iterable<A>, f: (input: A, i: number) => Result.Result<B, X>): Array<A>`
- **Import guidance:** Start from `import { Array } from "effect"` and use `Array.dropWhileFilter`.
- **Suggested snippet:** Use a callback that succeeds for initial values and fails at one clear boundary, apply `Array.dropWhileFilter`, and assert the resulting collection so the take/drop boundary is visible. The callback's `Result` is control flow, not the API output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Array.getReadonlyReducerConcat`

- **Source:** `packages/effect/src/Array.ts:4902`
- **Kind / category:** `root-declaration` / `folding`
- **Priority:** **optional**
- **Current description:** Returns a `Reducer` that combines `ReadonlyArray` values by concatenation.
- **Signature hint:** `declare function getReadonlyReducerConcat<A>(): Reducer.Reducer<ReadonlyArray<A>>`
- **Import guidance:** Start from `import { Array } from "effect"` and use `Array.getReadonlyReducerConcat`.
- **Suggested snippet:** Obtain the reducer from `Array.getReadonlyReducerConcat`, combine two or three small representative values with the public Reducer operation used by nearby tests, and assert the final value. Include the identity only when it distinguishes a sibling reducer.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Array.makeReducerConcat`

- **Source:** `packages/effect/src/Array.ts:4914`
- **Kind / category:** `root-declaration` / `folding`
- **Priority:** **optional**
- **Current description:** Returns a `Reducer` that combines `Array` values by concatenation.
- **Signature hint:** `declare function makeReducerConcat<A>(): Reducer.Reducer<Array<A>>`
- **Import guidance:** Start from `import { Array } from "effect"` and use `Array.makeReducerConcat`.
- **Suggested snippet:** Obtain the reducer from `Array.makeReducerConcat`, combine two or three small representative values with the public Reducer operation used by nearby tests, and assert the final value. Include the identity only when it distinguishes a sibling reducer.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Array.ReadonlyArrayTypeLambda`

- **Source:** `packages/effect/src/Array.ts:58`
- **Kind / category:** `root-declaration` / `type lambdas`
- **Priority:** **optional**
- **Current description:** Type lambda for `ReadonlyArray`, used for higher-kinded type operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Array.ReadonlyArrayTypeLambda`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Array.ReadonlyArray`

- **Source:** `packages/effect/src/Array.ts:3414`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Utility types for working with `ReadonlyArray` at the type level. Use these to infer element types, preserve non-emptiness, and flatten nested arrays.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Array.ReadonlyArray`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
