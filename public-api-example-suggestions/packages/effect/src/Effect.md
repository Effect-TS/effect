# Example Suggestions: `effect/Effect`

- **Package:** `effect`
- **Source:** `packages/effect/src/Effect.ts`
- **Uncovered API records:** 57
- **Priorities:** 3 required, 18 recommended, 32 optional, 4 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      |  Line | Kind                    | Priority        |
| ---------------------------------------- | ----: | ----------------------- | --------------- |
| `effect/Effect.onErrorFilter`            |  6831 | `root-declaration`      | **required**    |
| `effect/Effect.onExitPrimitive`          |  6863 | `root-declaration`      | **required**    |
| `effect/Effect.onExitFilter`             |  6964 | `root-declaration`      | **required**    |
| `effect/Effect.findFirstFilter`          |   707 | `root-declaration`      | **recommended** |
| `effect/Effect.void`                     |  1152 | `root-declaration`      | **recommended** |
| `effect/Effect.undefined`                |  1163 | `root-declaration`      | **recommended** |
| `effect/Effect.bindTo`                   |  1267 | `root-declaration`      | **recommended** |
| `effect/Effect.let`                      |  1309 | `root-declaration`      | **recommended** |
| `effect/Effect.bind`                     |  1339 | `root-declaration`      | **recommended** |
| `effect/Effect.catch`                    |  2641 | `root-declaration`      | **recommended** |
| `effect/Effect.catchFilter`              |  3366 | `root-declaration`      | **recommended** |
| `effect/Effect.catchCauseFilter`         |  3497 | `root-declaration`      | **recommended** |
| `effect/Effect.tapCauseFilter`           |  3846 | `root-declaration`      | **recommended** |
| `effect/Effect.withErrorReporting`       |  4319 | `root-declaration`      | **recommended** |
| `effect/Effect.filterMap`                |  4911 | `root-declaration`      | **recommended** |
| `effect/Effect.filterMapEffect`          |  4945 | `root-declaration`      | **recommended** |
| `effect/Effect.filterMapOrElse`          |  5034 | `root-declaration`      | **recommended** |
| `effect/Effect.filterMapOrFail`          |  5131 | `root-declaration`      | **recommended** |
| `effect/Effect.matchCauseEffectEager`    |  5432 | `root-declaration`      | **recommended** |
| `effect/Effect.replicate`                |  7627 | `root-declaration`      | **recommended** |
| `effect/Effect.awaitAllChildren`         |  8610 | `root-declaration`      | **recommended** |
| `effect/Effect.RunOptions`               |  8679 | `root-declaration`      | **optional**    |
| `effect/Effect.TagsWithReason`           |  3106 | `root-declaration`      | **optional**    |
| `effect/Effect.abortSignal`              |  7357 | `root-declaration`      | **optional**    |
| `effect/Effect.Effect`                   |   117 | `root-declaration`      | **optional**    |
| `effect/Effect.EffectUnify`              |   131 | `root-declaration`      | **optional**    |
| `effect/Effect.EffectTypeLambda`         |   144 | `root-declaration`      | **optional**    |
| `effect/Effect.Success`                  |   174 | `root-declaration`      | **optional**    |
| `effect/Effect.Error`                    |   195 | `root-declaration`      | **optional**    |
| `effect/Effect.Services`                 |   212 | `root-declaration`      | **optional**    |
| `effect/Effect.EffectIterator`           |   245 | `root-declaration`      | **optional**    |
| `effect/Effect.All`                      |   261 | `namespace`             | **optional**    |
| `effect/Effect.All.EffectAny`            |   268 | `namespace-declaration` | **optional**    |
| `effect/Effect.All.ReturnIterable`       |   276 | `namespace-declaration` | **optional**    |
| `effect/Effect.All.ReturnTuple`          |   293 | `namespace-declaration` | **optional**    |
| `effect/Effect.All.ReturnObject`         |   324 | `namespace-declaration` | **optional**    |
| `effect/Effect.All.IsDiscard`            |   350 | `namespace-declaration` | **optional**    |
| `effect/Effect.All.IsResult`             |   361 | `namespace-declaration` | **optional**    |
| `effect/Effect.All.Return`               |   369 | `namespace-declaration` | **optional**    |
| `effect/Effect.gen`                      |  1438 | `namespace`             | **optional**    |
| `effect/Effect.gen.Return`               |  1445 | `namespace-declaration` | **optional**    |
| `effect/Effect.Retry`                    |  3941 | `namespace`             | **optional**    |
| `effect/Effect.Retry.Return`             |  3948 | `namespace-declaration` | **optional**    |
| `effect/Effect.Retry.Options`            |  3977 | `namespace-declaration` | **optional**    |
| `effect/Effect.Repeat`                   |  7368 | `namespace`             | **optional**    |
| `effect/Effect.Repeat.Return`            |  7375 | `namespace-declaration` | **optional**    |
| `effect/Effect.Repeat.Options`           |  7406 | `namespace-declaration` | **optional**    |
| `effect/Effect.fn`                       |  9224 | `namespace`             | **optional**    |
| `effect/Effect.fn.Untraced`              |  9278 | `namespace-declaration` | **optional**    |
| `effect/Effect.fn.Traced`                | 10866 | `namespace-declaration` | **optional**    |
| `effect/Effect.Effectify`                | 14615 | `namespace`             | **optional**    |
| `effect/Effect.Effectify.Effectify`      | 14630 | `namespace-declaration` | **optional**    |
| `effect/Effect.Effectify.EffectifyError` | 14778 | `namespace-declaration` | **optional**    |
| `effect/Effect.requestUnsafe`            |  8390 | `root-declaration`      | **discouraged** |
| `effect/Effect.TypeId (type)`            |    83 | `root-declaration`      | **discouraged** |
| `effect/Effect.TypeId (value)`           |    91 | `root-declaration`      | **discouraged** |
| `effect/Effect.Variance`                 |   154 | `root-declaration`      | **discouraged** |

## Required

### `effect/Effect.onErrorFilter`

- **Source:** `packages/effect/src/Effect.ts:6831`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Runs the finalizer only when this effect fails and the cause matches the provided `Filter`.
- **Signature hint:** `declare function onErrorFilter<A, E, EB, X, XE, XR>(filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (failure: EB, cause: Cause.Cause<E>) => Effect<void, XE, XR>): <R>(self: Effect<A, E, R>) => Effect<A, E | XE, R | XR> declare function onErrorFilter<A, E, R, EB, X, XE, XR>(self: Effect<A, E, R>, filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (failure: EB, cause: Cause.Cause<E>) => Effect<void, XE, XR>): Effect<A, E | XE, R | XR>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.onErrorFilter`.
- **Suggested snippet:** Run one Effect whose cause or exit matches the filter and record that the callback supplied to `Effect.onErrorFilter` ran. Add one non-matching exit only if it concisely demonstrates that the callback is skipped.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/Effect.onExitPrimitive`

- **Source:** `packages/effect/src/Effect.ts:6863`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Runs an optional finalizer with the effect's `Exit` value when the effect completes.
- **Signature hint:** `declare function onExitPrimitive<A, E, R, XE = never, XR = never>(self: Effect<A, E, R>, f: (exit: Exit.Exit<A, E>) => Effect<void, XE, XR> | undefined, interruptible?: boolean): Effect<A, E | XE, R | XR>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.onExitPrimitive`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.onExitPrimitive`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/Effect.onExitFilter`

- **Source:** `packages/effect/src/Effect.ts:6964`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Runs the cleanup effect only when the `Exit` matches the provided `Filter`.
- **Signature hint:** `declare function onExitFilter<A, E, XE, XR, B, X>(filter: Filter.Filter<Exit.Exit<NoInfer<A>, NoInfer<E>>, B, X>, f: (b: B, exit: Exit.Exit<NoInfer<A>, NoInfer<E>>) => Effect<void, XE, XR>): <R>(self: Effect<A, E, R>) => Effect<A, E | XE, R | XR> declare function onExitFilter<A, E, R, XE, XR, B, X>(self: Effect<A, E, R>, filter: Filter.Filter<Exit.Exit<NoInfer<A>, NoInfer<E>>, B, X>, f: (b: B, exit: Exit.Exit<NoInfer<A>, NoInfer<E>>) => Effect<void, XE, XR>): Effect<A, E | XE, R | XR>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.onExitFilter`.
- **Suggested snippet:** Run one Effect whose cause or exit matches the filter and record that the callback supplied to `Effect.onExitFilter` ran. Add one non-matching exit only if it concisely demonstrates that the callback is skipped.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/Effect.findFirstFilter`

- **Source:** `packages/effect/src/Effect.ts:707`
- **Kind / category:** `root-declaration` / `collecting`
- **Priority:** **recommended**
- **Current description:** Returns the first value that passes an effectful `FilterEffect`.
- **Signature hint:** `declare function findFirstFilter<A, B, X, E, R>(filter: (input: NoInfer<A>, i: number) => Effect<Result.Result<B, X>, E, R>): (elements: Iterable<A>) => Effect<Option<B>, E, R> declare function findFirstFilter<A, B, X, E, R>(elements: Iterable<A>, filter: (input: NoInfer<A>, i: number) => Effect<Result.Result<B, X>, E, R>): Effect<Option<B>, E, R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.findFirstFilter`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.findFirstFilter`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.void`

- **Source:** `packages/effect/src/Effect.ts:1152`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Returns an effect that succeeds with `void`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.void`.
- **Suggested snippet:** Use `Effect.void` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.undefined`

- **Source:** `packages/effect/src/Effect.ts:1163`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Returns an effect that succeeds with `undefined`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.undefined`.
- **Suggested snippet:** Use `Effect.undefined` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.bindTo`

- **Source:** `packages/effect/src/Effect.ts:1267`
- **Kind / category:** `root-declaration` / `do notation`
- **Priority:** **recommended**
- **Current description:** Gives a name to the success value of an `Effect`, creating a single-key record used in do notation pipelines.
- **Signature hint:** `declare function bindTo<N extends string>(name: N): <A, E, R>(self: Effect<A, E, R>) => Effect<{ [K in N]: A; }, E, R> declare function bindTo<A, E, R, N extends string>(self: Effect<A, E, R>, name: N): Effect<{ [K in N]: A; }, E, R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.bindTo`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.bindTo`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.let`

- **Source:** `packages/effect/src/Effect.ts:1309`
- **Kind / category:** `root-declaration` / `do notation`
- **Priority:** **recommended**
- **Current description:** Adds a computed plain value to the do notation record.
- **Signature hint:** `declare function let<N extends string, A extends Record<string, any>, B>(name: N, f: (a: NoInfer<A>) => B): <E, R>(self: Effect<A, E, R>) => Effect<Simplify<Omit<A, N> & Record<N, B>>, E, R> declare function let<A extends Record<string, any>, E, R, B, N extends string>(self: Effect<A, E, R>, name: N, f: (a: NoInfer<A>) => B): Effect<Simplify<Omit<A, N> & Record<N, B>>, E, R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.let`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.let`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.bind`

- **Source:** `packages/effect/src/Effect.ts:1339`
- **Kind / category:** `root-declaration` / `do notation`
- **Priority:** **recommended**
- **Current description:** Adds an `Effect` value to the do notation record under a given name.
- **Signature hint:** `declare function bind<N extends string, A extends Record<string, any>, B, E2, R2>(name: N, f: (a: NoInfer<A>) => Effect<B, E2, R2>): <E, R>(self: Effect<A, E, R>) => Effect<Simplify<Omit<A, N> & Record<N, B>>, E | E2, R | R2> declare function bind<A extends Record<string, any>, E, R, B, E2, R2, N extends string>(self: Effect<A, E, R>, name: N, f: (a: NoInfer<A>) => Effect<B, E2, R2>): Effect<Simplify<Omit<A, N> & Record<N, B>>, E | E2, R | R2>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.bind`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.bind`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.catch`

- **Source:** `packages/effect/src/Effect.ts:2641`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Handles all errors in an effect by providing a fallback effect.
- **Signature hint:** `declare const _catch: { <E, A2, E2, R2>(f: (e: E) => Effect<A2, E2, R2>): <A, R>(self: Effect<A, E, R>) => Effect<A2 | A, E2, R2 | R>; <A, E, R, A2, E2, R2>(self: Effect<A, E, R>, f: (e: E) => Effect<A2, E2, R2>): Effect<A2 | A, E2, R2 | R>; } export { _catch as catch }`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.catch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Handles all errors in an effect by providing a fallback effect. Call `Effect.catch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.catchFilter`

- **Source:** `packages/effect/src/Effect.ts:3366`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from specific errors using a `Filter`.
- **Signature hint:** `declare function catchFilter<E, EB, A2, E2, R2, X, A3 = unassigned, E3 = never, R3 = never>(filter: Filter.Filter<NoInfer<E>, EB, X>, f: (e: EB) => Effect<A2, E2, R2>, orElse?: ((e: X) => Effect<A3, E3, R3>) | undefined): <A, R>(self: Effect<A, E, R>) => Effect<A | A2 | Exclude<A3, unassigned>, E2 | E3 | (A3 extends unassigned ? X : never), R | R2 | R3> declare function catchFilter<A, E, R, EB, A2, E2, R2, X, A3 = unassigned, E3 = never, R3 = never>(self: Effect<A, E, R>, filter: Filter.Filter<NoInfer<E>, EB, X>, f: (e: EB) => Effect<A2, E2, R2>, orElse?: ((e: X) => Effect<A3, E3, R3>) | undefined): Effect<A | A2 | Exclude<A3, unassigned>, E2 | E3 | (A3 extends unassigned ? X : never), R | R2 | R3>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.catchFilter`.
- **Suggested snippet:** Create one failing Effect whose error or cause matches the filter, apply `Effect.catchFilter`, and assert the recovered value or recorded tap. Use one non-matching failure only to show propagation.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.catchCauseFilter`

- **Source:** `packages/effect/src/Effect.ts:3497`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from specific failures based on a `Filter`.
- **Signature hint:** `declare function catchCauseFilter<E, B, E2, R2, EB, X extends Cause.Cause<any>>(filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (failure: EB, cause: Cause.Cause<E>) => Effect<B, E2, R2>): <A, R>(self: Effect<A, E, R>) => Effect<A | B, Cause.Cause.Error<X> | E2, R | R2> declare function catchCauseFilter<A, E, R, B, E2, R2, EB, X extends Cause.Cause<any>>(self: Effect<A, E, R>, filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (failure: EB, cause: Cause.Cause<E>) => Effect<B, E2, R2>): Effect<A | B, Cause.Cause.Error<X> | E2, R | R2>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.catchCauseFilter`.
- **Suggested snippet:** Create one failing Effect whose error or cause matches the filter, apply `Effect.catchCauseFilter`, and assert the recovered value or recorded tap. Use one non-matching failure only to show propagation.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.tapCauseFilter`

- **Source:** `packages/effect/src/Effect.ts:3846`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Executes a side effect conditionally when a failed effect's cause passes a filter.
- **Signature hint:** `declare function tapCauseFilter<E, B, E2, R2, EB, X extends Cause.Cause<any>>(filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (a: EB, cause: Cause.Cause<E>) => Effect<B, E2, R2>): <A, R>(self: Effect<A, E, R>) => Effect<A, E | E2, R | R2> declare function tapCauseFilter<A, E, R, B, E2, R2, EB, X extends Cause.Cause<any>>(self: Effect<A, E, R>, filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (a: EB, cause: Cause.Cause<E>) => Effect<B, E2, R2>): Effect<A, E | E2, R | R2>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.tapCauseFilter`.
- **Suggested snippet:** Create one failing Effect whose error or cause matches the filter, apply `Effect.tapCauseFilter`, and assert the recovered value or recorded tap. Use one non-matching failure only to show propagation.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.withErrorReporting`

- **Source:** `packages/effect/src/Effect.ts:4319`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Runs an effect and reports any errors to the configured `ErrorReporter`s.
- **Signature hint:** `declare function withErrorReporting<Arg extends Effect<any, any, any> | { readonly defectsOnly?: boolean | undefined; } | undefined = { readonly defectsOnly?: boolean | undefined; }>(effectOrOptions: Arg, options?: { readonly defectsOnly?: boolean | undefined; } | undefined): [Arg] extends [Effect<infer _A, infer _E, infer _R>] ? Arg : <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.withErrorReporting`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs an effect and reports any errors to the configured `ErrorReporter`s. Call `Effect.withErrorReporting` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.filterMap`

- **Source:** `packages/effect/src/Effect.ts:4911`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps elements of an iterable with a `Filter`.
- **Signature hint:** `declare function filterMap<A, B, X>(filter: Filter.Filter<NoInfer<A>, B, X>): (elements: Iterable<A>) => Effect<Array<B>> declare function filterMap<A, B, X>(elements: Iterable<A>, filter: Filter.Filter<NoInfer<A>, B, X>): Effect<Array<B>>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.filterMap`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.filterMap`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.filterMapEffect`

- **Source:** `packages/effect/src/Effect.ts:4945`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps elements of an iterable effectfully with a `FilterEffect`.
- **Signature hint:** `declare function filterMapEffect<A, B, X, E, R>(filter: Filter.FilterEffect<NoInfer<A>, B, X, E, R>, options?: { readonly concurrency?: Concurrency | undefined; }): (elements: Iterable<A>) => Effect<Array<B>, E, R> declare function filterMapEffect<A, B, X, E, R>(elements: Iterable<A>, filter: Filter.FilterEffect<NoInfer<A>, B, X, E, R>, options?: { readonly concurrency?: Concurrency | undefined; }): Effect<Array<B>, E, R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.filterMapEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.filterMapEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.filterMapOrElse`

- **Source:** `packages/effect/src/Effect.ts:5034`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters an effect with a `Filter`, providing an alternative effect on failure.
- **Signature hint:** `declare function filterMapOrElse<A, B, X, C, E2, R2>(filter: Filter.Filter<NoInfer<A>, B, X>, orElse: (x: X) => Effect<C, E2, R2>): <E, R>(self: Effect<A, E, R>) => Effect<B | C, E2 | E, R2 | R> declare function filterMapOrElse<A, E, R, B, X, C, E2, R2>(self: Effect<A, E, R>, filter: Filter.Filter<NoInfer<A>, B, X>, orElse: (x: X) => Effect<C, E2, R2>): Effect<B | C, E | E2, R | R2>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.filterMapOrElse`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.filterMapOrElse`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.filterMapOrFail`

- **Source:** `packages/effect/src/Effect.ts:5131`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps an effect with a `Filter`, failing when the filter fails.
- **Signature hint:** `declare function filterMapOrFail<A, B, X, E2>(filter: Filter.Filter<NoInfer<A>, B, X>, orFailWith: (x: X) => E2): <E, R>(self: Effect<A, E, R>) => Effect<B, E2 | E, R> declare function filterMapOrFail<A, B, X>(filter: Filter.Filter<NoInfer<A>, B, X>): <E, R>(self: Effect<A, E, R>) => Effect<B, Cause.NoSuchElementError | E, R> declare function filterMapOrFail<A, E, R, B, X, E2>(self: Effect<A, E, R>, filter: Filter.Filter<A, B, X>, orFailWith: (x: X) => E2): Effect<B, E2 | E, R> declare function filterMapOrFail<A, E, R, B, X>(self: Effect<A, E, R>, filter: Filter.Filter<A, B, X>): Effect<B, Cause.NoSuchElementError | E, R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.filterMapOrFail`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.filterMapOrFail`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.matchCauseEffectEager`

- **Source:** `packages/effect/src/Effect.ts:5432`
- **Kind / category:** `root-declaration` / `pattern matching`
- **Priority:** **recommended**
- **Current description:** Handles success or failure eagerly with effectful handlers when the effect is already resolved.
- **Signature hint:** `declare function matchCauseEffectEager<E, A2, E2, R2, A, A3, E3, R3>(options: { readonly onFailure: (cause: Cause.Cause<E>) => Effect<A2, E2, R2>; readonly onSuccess: (a: A) => Effect<A3, E3, R3>; }): <R>(self: Effect<A, E, R>) => Effect<A2 | A3, E2 | E3, R2 | R3 | R> declare function matchCauseEffectEager<A, E, R, A2, E2, R2, A3, E3, R3>(self: Effect<A, E, R>, options: { readonly onFailure: (cause: Cause.Cause<E>) => Effect<A2, E2, R2>; readonly onSuccess: (a: A) => Effect<A3, E3, R3>; }): Effect<A2 | A3, E2 | E3, R2 | R3 | R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.matchCauseEffectEager`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.matchCauseEffectEager`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.replicate`

- **Source:** `packages/effect/src/Effect.ts:7627`
- **Kind / category:** `root-declaration` / `collecting`
- **Priority:** **recommended**
- **Current description:** Returns an array of `n` identical effects.
- **Signature hint:** `declare function replicate(n: number): <A, E, R>(self: Effect<A, E, R>) => Array<Effect<A, E, R>> declare function replicate<A, E, R>(self: Effect<A, E, R>, n: number): Array<Effect<A, E, R>>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.replicate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns an array of `n` identical effects. Call `Effect.replicate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Effect.awaitAllChildren`

- **Source:** `packages/effect/src/Effect.ts:8610`
- **Kind / category:** `root-declaration` / `supervision & fibers`
- **Priority:** **recommended**
- **Current description:** Waits for all child fibers forked by this effect to complete before this effect completes.
- **Signature hint:** `declare function awaitAllChildren<A, E, R>(self: Effect<A, E, R>): Effect<A, E, R>`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.awaitAllChildren`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Effect.awaitAllChildren`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Effect.RunOptions`

- **Source:** `packages/effect/src/Effect.ts:8679`
- **Kind / category:** `root-declaration` / `running`
- **Priority:** **optional**
- **Current description:** Configuration options for running Effect programs, providing control over interruption and scheduling behavior.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.RunOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.TagsWithReason`

- **Source:** `packages/effect/src/Effect.ts:3106`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Type helper that keeps only error tags whose tagged error contains a tagged `reason` field.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.TagsWithReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.abortSignal`

- **Source:** `packages/effect/src/Effect.ts:7357`
- **Kind / category:** `root-declaration` / `interruption`
- **Priority:** **optional**
- **Current description:** Creates an AbortSignal that is managed by the provided scope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.abortSignal`.
- **Suggested snippet:** Use `Effect.abortSignal` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Effect`

- **Source:** `packages/effect/src/Effect.ts:117`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `Effect` interface defines a value that lazily describes a workflow or job. The workflow requires some context `R`, and may fail with an error of type `E`, or succeed with a value of type `A`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Effect`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.EffectUnify`

- **Source:** `packages/effect/src/Effect.ts:131`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level unification support for `Effect` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.EffectUnify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.EffectTypeLambda`

- **Source:** `packages/effect/src/Effect.ts:144`
- **Kind / category:** `root-declaration` / `type lambdas`
- **Priority:** **optional**
- **Current description:** Type lambda used to represent `Effect` in higher-kinded APIs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.EffectTypeLambda`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Success`

- **Source:** `packages/effect/src/Effect.ts:174`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the success type from an `Effect`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Error`

- **Source:** `packages/effect/src/Effect.ts:195`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error type from an `Effect`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Services`

- **Source:** `packages/effect/src/Effect.ts:212`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the required services type from an `Effect`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.EffectIterator`

- **Source:** `packages/effect/src/Effect.ts:245`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Iterator interface for Effect generators, enabling Effect values to work with generator functions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.EffectIterator`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All`

- **Source:** `packages/effect/src/Effect.ts:261`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type utilities for the `Effect.all` function, which handles collecting multiple effects into various output structures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All.EffectAny`

- **Source:** `packages/effect/src/Effect.ts:268`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Alias for any `Effect` value accepted by `Effect.all`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All.EffectAny`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All.ReturnIterable`

- **Source:** `packages/effect/src/Effect.ts:276`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the return type for `Effect.all` when collecting an iterable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All.ReturnIterable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All.ReturnTuple`

- **Source:** `packages/effect/src/Effect.ts:293`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the return type for `Effect.all` when collecting a tuple.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All.ReturnTuple`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All.ReturnObject`

- **Source:** `packages/effect/src/Effect.ts:324`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the return type for `Effect.all` when collecting a record.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All.ReturnObject`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All.IsDiscard`

- **Source:** `packages/effect/src/Effect.ts:350`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Detects whether `Effect.all` should discard collected values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All.IsDiscard`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All.IsResult`

- **Source:** `packages/effect/src/Effect.ts:361`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Detects whether `Effect.all` should collect results in `Result` mode.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All.IsResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.All.Return`

- **Source:** `packages/effect/src/Effect.ts:369`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the return type for `Effect.all` from its input and options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.All.Return`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.gen`

- **Source:** `packages/effect/src/Effect.ts:1438`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type helpers for `Effect.gen` generator return signatures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.gen`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.gen.Return`

- **Source:** `packages/effect/src/Effect.ts:1445`
- **Kind / category:** `namespace-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Generator return type accepted by `Effect.gen`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.gen.Return`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Retry`

- **Source:** `packages/effect/src/Effect.ts:3941`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type helpers for retrying effects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Retry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Retry.Return`

- **Source:** `packages/effect/src/Effect.ts:3948`
- **Kind / category:** `namespace-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Computes the result type of `Effect.retry` from the original effect and retry options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Retry.Return`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Retry.Options`

- **Source:** `packages/effect/src/Effect.ts:3977`
- **Kind / category:** `namespace-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Options that control whether and how a failing effect is retried.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Retry.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Repeat`

- **Source:** `packages/effect/src/Effect.ts:7368`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type helpers for repeating effects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Repeat`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Repeat.Return`

- **Source:** `packages/effect/src/Effect.ts:7375`
- **Kind / category:** `namespace-declaration` / `repetition`
- **Priority:** **optional**
- **Current description:** Computes the result type of `Effect.repeat` from the original effect and repeat options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Repeat.Return`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Repeat.Options`

- **Source:** `packages/effect/src/Effect.ts:7406`
- **Kind / category:** `namespace-declaration` / `repetition`
- **Priority:** **optional**
- **Current description:** Options that control whether and how an effect is repeated.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Repeat.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.fn`

- **Source:** `packages/effect/src/Effect.ts:9224`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type helpers for functions built with `Effect.fn` and `Effect.fnUntraced`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.fn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.fn.Untraced`

- **Source:** `packages/effect/src/Effect.ts:9278`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Type of the untraced function builder used by `Effect.fnUntraced`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.fn.Untraced`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.fn.Traced`

- **Source:** `packages/effect/src/Effect.ts:10866`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Type of the traced function builder used by `Effect.fn`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.fn.Traced`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Effectify`

- **Source:** `packages/effect/src/Effect.ts:14615`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type helpers for converting callback-based functions into `Effect` functions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Effectify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Effectify.Effectify`

- **Source:** `packages/effect/src/Effect.ts:14630`
- **Kind / category:** `namespace-declaration` / `effectify`
- **Priority:** **optional**
- **Current description:** Converts a callback-based function type into an `Effect`-returning function type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Effectify.Effectify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Effect.Effectify.EffectifyError`

- **Source:** `packages/effect/src/Effect.ts:14778`
- **Kind / category:** `namespace-declaration` / `effectify`
- **Priority:** **optional**
- **Current description:** Extracts the callback error type from a callback-based function type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Effect.Effectify.EffectifyError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Effect.requestUnsafe`

- **Source:** `packages/effect/src/Effect.ts:8390`
- **Kind / category:** `root-declaration` / `requests & batching`
- **Priority:** **discouraged**
- **Current description:** Registers a request with a resolver and delivers the exit value via `onExit`.
- **Signature hint:** `declare function requestUnsafe<A extends Request.Any>(self: A, options: { readonly resolver: RequestResolver<A>; readonly onExit: (exit: Exit.Exit<Request.Success<A>, Request.Error<A>>) => void; readonly context: Context.Context<never>; }): () => void`
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.requestUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Effect.requestUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Effect.TypeId (type)`

- **Source:** `packages/effect/src/Effect.ts:83`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier for `Effect` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Effect.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Effect.TypeId (value)`

- **Source:** `packages/effect/src/Effect.ts:91`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier used to recognize `Effect` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Effect } from "effect"` and use `Effect.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Effect.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Effect.Variance`

- **Source:** `packages/effect/src/Effect.ts:154`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Variance interface for Effect, encoding the type parameters' variance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Effect.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
