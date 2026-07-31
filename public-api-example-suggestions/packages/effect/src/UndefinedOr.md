# Example Suggestions: `effect/UndefinedOr`

- **Package:** `effect`
- **Source:** `packages/effect/src/UndefinedOr.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 3 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `effect/UndefinedOr.map`                  |   31 | `root-declaration` | **recommended** |
| `effect/UndefinedOr.match`                |   51 | `root-declaration` | **recommended** |
| `effect/UndefinedOr.getOrThrow`           |  118 | `root-declaration` | **recommended** |
| `effect/UndefinedOr.getOrThrowWith`       |   88 | `root-declaration` | **optional**    |
| `effect/UndefinedOr.liftThrowable`        |  139 | `root-declaration` | **optional**    |
| `effect/UndefinedOr.makeReducer`          |  171 | `root-declaration` | **optional**    |
| `effect/UndefinedOr.makeCombinerFailFast` |  200 | `root-declaration` | **optional**    |
| `effect/UndefinedOr.makeReducerFailFast`  |  228 | `root-declaration` | **optional**    |

## Recommended

### `effect/UndefinedOr.map`

- **Source:** `packages/effect/src/UndefinedOr.ts:31`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Maps a defined value with `f`, or returns `undefined` unchanged.
- **Signature hint:** `declare function map<A, B>(f: (a: A) => B): (self: A | undefined) => B | undefined declare function map<A, B>(self: A | undefined, f: (a: A) => B): B | undefined`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.map`.
- **Suggested snippet:** Apply `UndefinedOr.map` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/UndefinedOr.match`

- **Source:** `packages/effect/src/UndefinedOr.ts:51`
- **Kind / category:** `root-declaration` / `pattern matching`
- **Priority:** **recommended**
- **Current description:** Pattern matches on an `A | undefined` value, running `onDefined` when the value is present or evaluating `onUndefined` when the value is `undefined`.
- **Signature hint:** `declare function match<B, A, C = B>(options: { readonly onUndefined: LazyArg<B>; readonly onDefined: (a: A) => C; }): (self: A | undefined) => B | C declare function match<A, B, C = B>(self: A | undefined, options: { readonly onUndefined: LazyArg<B>; readonly onDefined: (a: A) => C; }): B | C`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.match`.
- **Suggested snippet:** Create one value for each meaningful branch handled by `UndefinedOr.match`, invoke the matcher or fold directly, and assert the distinct branch results with minimal callbacks.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/UndefinedOr.getOrThrow`

- **Source:** `packages/effect/src/UndefinedOr.ts:118`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Returns the defined value, or throws a default `Error` when the input is `undefined`.
- **Signature hint:** `declare function getOrThrow<A>(self: A | undefined): A`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.getOrThrow`.
- **Suggested snippet:** Create a small representative input, call `UndefinedOr.getOrThrow`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/UndefinedOr.getOrThrowWith`

- **Source:** `packages/effect/src/UndefinedOr.ts:88`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Returns the defined value, or throws the value produced by `onUndefined` when the input is `undefined`.
- **Signature hint:** `declare function getOrThrowWith(onUndefined: () => unknown): <A>(self: A | undefined) => A declare function getOrThrowWith<A>(self: A | undefined, onUndefined: () => unknown): A`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.getOrThrowWith`.
- **Suggested snippet:** Create a small representative input, call `UndefinedOr.getOrThrowWith`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/UndefinedOr.liftThrowable`

- **Source:** `packages/effect/src/UndefinedOr.ts:139`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts a throwing function into one that returns successful results unchanged and returns `undefined` when the function throws.
- **Signature hint:** `declare function liftThrowable<A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): (...a: A) => B | undefined`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.liftThrowable`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a throwing function into one that returns successful results unchanged and returns `undefined` when the function throws. Call `UndefinedOr.liftThrowable` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/UndefinedOr.makeReducer`

- **Source:** `packages/effect/src/UndefinedOr.ts:171`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Reducer` for `UndefinedOr<A>` that prioritizes the first non-`undefined` value and combines values when both operands are present.
- **Signature hint:** `declare function makeReducer<A>(combiner: Combiner.Combiner<A>): Reducer.Reducer<A | undefined>`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.makeReducer`.
- **Suggested snippet:** Obtain the reducer from `UndefinedOr.makeReducer`, combine two or three small representative values with the public Reducer operation used by nearby tests, and assert the final value. Include the identity only when it distinguishes a sibling reducer.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/UndefinedOr.makeCombinerFailFast`

- **Source:** `packages/effect/src/UndefinedOr.ts:200`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Combiner` for `A | undefined` that combines values only when both operands are defined.
- **Signature hint:** `declare function makeCombinerFailFast<A>(combiner: Combiner.Combiner<A>): Combiner.Combiner<A | undefined>`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.makeCombinerFailFast`.
- **Suggested snippet:** Construct one representative value with `UndefinedOr.makeCombinerFailFast`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/UndefinedOr.makeReducerFailFast`

- **Source:** `packages/effect/src/UndefinedOr.ts:228`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Reducer` for `A | undefined` by wrapping an existing reducer with fail-fast semantics.
- **Signature hint:** `declare function makeReducerFailFast<A>(reducer: Reducer.Reducer<A>): Reducer.Reducer<A | undefined>`
- **Import guidance:** Start from `import { UndefinedOr } from "effect"` and use `UndefinedOr.makeReducerFailFast`.
- **Suggested snippet:** Obtain the reducer from `UndefinedOr.makeReducerFailFast`, combine two or three small representative values with the public Reducer operation used by nearby tests, and assert the final value. Include the identity only when it distinguishes a sibling reducer.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
