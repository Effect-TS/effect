# Example Suggestions: `effect/Stream`

- **Package:** `effect`
- **Source:** `packages/effect/src/Stream.ts`
- **Uncovered API records:** 18
- **Priorities:** 0 required, 10 recommended, 4 optional, 4 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                               |  Line | Kind               | Priority        |
| --------------------------------- | ----: | ------------------ | --------------- |
| `effect/Stream.partitionEffect`   |  4318 | `root-declaration` | **recommended** |
| `effect/Stream.timeoutOrElse`     |  2596 | `root-declaration` | **recommended** |
| `effect/Stream.filterMap`         |  4084 | `root-declaration` | **recommended** |
| `effect/Stream.filterMapEffect`   |  4157 | `root-declaration` | **recommended** |
| `effect/Stream.catchFilter`       |  4930 | `root-declaration` | **recommended** |
| `effect/Stream.catchCauseFilter`  |  5591 | `root-declaration` | **recommended** |
| `effect/Stream.takeWhileFilter`   |  6361 | `root-declaration` | **recommended** |
| `effect/Stream.dropWhileFilter`   |  6620 | `root-declaration` | **recommended** |
| `effect/Stream.groupAdjacentBy`   |  8200 | `root-declaration` | **recommended** |
| `effect/Stream.runLast`           | 10534 | `root-declaration` | **recommended** |
| `effect/Stream.StreamUnify`       |   136 | `root-declaration` | **optional**    |
| `effect/Stream.StreamUnifyIgnore` |   146 | `root-declaration` | **optional**    |
| `effect/Stream.HaltStrategy`      |   304 | `root-declaration` | **optional**    |
| `effect/Stream.EventListener`     |  1356 | `root-declaration` | **optional**    |
| `effect/Stream.TypeId (type)`     |    77 | `root-declaration` | **discouraged** |
| `effect/Stream.TypeId (value)`    |    93 | `root-declaration` | **discouraged** |
| `effect/Stream.Variance`          |   183 | `root-declaration` | **discouraged** |
| `effect/Stream.VarianceStruct`    |   198 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Stream.partitionEffect`

- **Source:** `packages/effect/src/Stream.ts:4318`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Splits a stream with an effectful `Filter`, returning scoped streams for filter successes and failures.
- **Signature hint:** `declare function partitionEffect<A, Pass, Fail, EX, RX>(filter: Filter.FilterEffect<NoInfer<A>, Pass, Fail, EX, RX>, options?: { readonly capacity?: number | 'unbounded' | undefined; readonly concurrency?: number | 'unbounded' | undefined; }): <E, R>(self: Stream<A, E, R>) => Effect.Effect<[passes: Stream<Pass, E | EX>, fails: Stream<Fail, E | EX>], never, R | RX | Scope.Scope> declare function partitionEffect<A, E, R, Pass, Fail, EX, RX>(self: Stream<A, E, R>, filter: Filter.FilterEffect<NoInfer<A>, Pass, Fail, EX, RX>, options?: { readonly capacity?: number | 'unbounded' | undefined; readonly concurrency?: number | 'unbounded' | undefined; }): Effect.Effect<[passes: Stream<Pass, E | EX>, fails: Stream<Fail, E | EX>], never, R | RX | Scope.Scope>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.partitionEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Stream.partitionEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.timeoutOrElse`

- **Source:** `packages/effect/src/Stream.ts:2596`
- **Kind / category:** `root-declaration` / `rate limiting`
- **Priority:** **recommended**
- **Current description:** Switches to a fallback stream if this stream does not emit a value within the specified duration.
- **Signature hint:** `declare function timeoutOrElse<B, E2, R2>(options: { readonly duration: Duration.Input; readonly orElse: () => Stream<B, E2, R2>; }): <A, E, R>(self: Stream<A, E, R>) => Stream<A | B, E | E2, R | R2> declare function timeoutOrElse<A, E, R, B, E2, R2>(self: Stream<A, E, R>, options: { readonly duration: Duration.Input; readonly orElse: () => Stream<B, E2, R2>; }): Stream<A | B, E | E2, R | R2>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.timeoutOrElse`.
- **Suggested snippet:** Create a finite stream, apply `Stream.timeoutOrElse`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.filterMap`

- **Source:** `packages/effect/src/Stream.ts:4084`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps stream elements in one pass using a `Filter`.
- **Signature hint:** `declare function filterMap<A, B, X>(filter: Filter.Filter<NoInfer<A>, B, X>): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R> declare function filterMap<A, E, R, B, X>(self: Stream<A, E, R>, filter: Filter.Filter<A, B, X>): Stream<B, E, R>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.filterMap`.
- **Suggested snippet:** Create a finite stream, apply `Stream.filterMap`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.filterMapEffect`

- **Source:** `packages/effect/src/Stream.ts:4157`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps elements in one pass effectfully using a `FilterEffect`.
- **Signature hint:** `declare function filterMapEffect<A, B, X, EX, RX>(filter: Filter.FilterEffect<NoInfer<A>, B, X, EX, RX>): <E, R>(self: Stream<A, E, R>) => Stream<B, E | EX, R | RX> declare function filterMapEffect<A, E, R, B, X, EX, RX>(self: Stream<A, E, R>, filter: Filter.FilterEffect<A, B, X, EX, RX>): Stream<B, E | EX, R | RX>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.filterMapEffect`.
- **Suggested snippet:** Create a finite stream, apply `Stream.filterMapEffect`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.catchFilter`

- **Source:** `packages/effect/src/Stream.ts:4930`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from errors that match a `Filter` by switching to a recovery stream.
- **Signature hint:** `declare function catchFilter<E, EB, A2, E2, R2, X, A3 = unassigned, E3 = never, R3 = never>(filter: Filter.Filter<NoInfer<E>, EB, X>, f: (failure: EB) => Stream<A2, E2, R2>, orElse?: ((failure: X) => Stream<A3, E3, R3>) | undefined): <A, R>(self: Stream<A, E, R>) => Stream<A | A2 | Exclude<A3, unassigned>, E2 | E3 | (A3 extends unassigned ? X : never), R | R2 | R3> declare function catchFilter<A, E, R, EB, A2, E2, R2, X, A3 = unassigned, E3 = never, R3 = never>(self: Stream<A, E, R>, filter: Filter.Filter<NoInfer<E>, EB, X>, f: (failure: EB) => Stream<A2, E2, R2>, orElse?: ((failure: X) => Stream<A3, E3, R3>) | undefined): Stream<A | A2 | Exclude<A3, unassigned>, E2 | E3 | (A3 extends unassigned ? X : never), R | R2 | R3>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.catchFilter`.
- **Suggested snippet:** Create one failing finite Stream whose error or cause matches the filter, apply `Stream.catchFilter`, and assert the recovered value or recorded tap. Use one non-matching failure only to show propagation.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.catchCauseFilter`

- **Source:** `packages/effect/src/Stream.ts:5591`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from stream failures by filtering the `Cause` and switching to a recovery stream.
- **Signature hint:** `declare function catchCauseFilter<E, EB, A2, E2, R2, X extends Cause.Cause<any>>(filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (failure: EB, cause: Cause.Cause<E>) => Stream<A2, E2, R2>): <A, R>(self: Stream<A, E, R>) => Stream<A | A2, Cause.Cause.Error<X> | E2, R2 | R> declare function catchCauseFilter<A, E, R, EB, A2, E2, R2, X extends Cause.Cause<any>>(self: Stream<A, E, R>, filter: Filter.Filter<Cause.Cause<E>, EB, X>, f: (failure: EB, cause: Cause.Cause<E>) => Stream<A2, E2, R2>): Stream<A | A2, Cause.Cause.Error<X> | E2, R | R2>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.catchCauseFilter`.
- **Suggested snippet:** Create one failing finite Stream whose error or cause matches the filter, apply `Stream.catchCauseFilter`, and assert the recovered value or recorded tap. Use one non-matching failure only to show propagation.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.takeWhileFilter`

- **Source:** `packages/effect/src/Stream.ts:6361`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Takes the longest initial prefix accepted by a `Filter` and emits the filter's success values.
- **Signature hint:** `declare function takeWhileFilter<A, B, X>(f: Filter.Filter<NoInfer<A>, B, X>): <E, R>(self: Stream<A, E, R>) => Stream<B, E, R> declare function takeWhileFilter<A, E, R, B, X>(self: Stream<A, E, R>, f: Filter.Filter<NoInfer<A>, B, X>): Stream<B, E, R>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.takeWhileFilter`.
- **Suggested snippet:** Use a callback that succeeds for initial values and fails at one clear boundary, apply `Stream.takeWhileFilter`, and assert the resulting collection so the take/drop boundary is visible. The callback's `Result` is control flow, not the API output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.dropWhileFilter`

- **Source:** `packages/effect/src/Stream.ts:6620`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Drops elements while the filter succeeds.
- **Signature hint:** `declare function dropWhileFilter<A, B, X>(filter: Filter.Filter<NoInfer<A>, B, X>): <E, R>(self: Stream<A, E, R>) => Stream<A, E, R> declare function dropWhileFilter<A, E, R, B, X>(self: Stream<A, E, R>, filter: Filter.Filter<NoInfer<A>, B, X>): Stream<A, E, R>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.dropWhileFilter`.
- **Suggested snippet:** Use a callback that succeeds for initial values and fails at one clear boundary, apply `Stream.dropWhileFilter`, and assert the resulting collection so the take/drop boundary is visible. The callback's `Result` is control flow, not the API output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.groupAdjacentBy`

- **Source:** `packages/effect/src/Stream.ts:8200`
- **Kind / category:** `root-declaration` / `grouping`
- **Priority:** **recommended**
- **Current description:** Groups consecutive elements that have equal keys into non-empty arrays.
- **Signature hint:** `declare function groupAdjacentBy<A, K>(f: (a: NoInfer<A>) => K): <E, R>(self: Stream<A, E, R>) => Stream<readonly [K, Arr.NonEmptyArray<A>], E, R> declare function groupAdjacentBy<A, E, R, K>(self: Stream<A, E, R>, f: (a: NoInfer<A>) => K): Stream<readonly [K, Arr.NonEmptyArray<A>], E, R>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.groupAdjacentBy`.
- **Suggested snippet:** Create a finite stream, apply `Stream.groupAdjacentBy`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stream.runLast`

- **Source:** `packages/effect/src/Stream.ts:10534`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **recommended**
- **Current description:** Runs the stream and returns the last element as an `Option`.
- **Signature hint:** `declare function runLast<A, E, R>(self: Stream<A, E, R>): Effect.Effect<Option.Option<A>, E, R>`
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.runLast`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Stream.runLast`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Stream.StreamUnify`

- **Source:** `packages/effect/src/Stream.ts:136`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level unification hook for Stream within the Effect type system.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Stream.StreamUnify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Stream.StreamUnifyIgnore`

- **Source:** `packages/effect/src/Stream.ts:146`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level marker that excludes Stream from unification.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Stream.StreamUnifyIgnore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Stream.HaltStrategy`

- **Source:** `packages/effect/src/Stream.ts:304`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes how merged streams decide when to halt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Stream.HaltStrategy`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Stream.EventListener`

- **Source:** `packages/effect/src/Stream.ts:1356`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Interface representing an event listener target.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Stream.EventListener`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Stream.TypeId (type)`

- **Source:** `packages/effect/src/Stream.ts:77`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** String literal type used as the unique brand for `Stream` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Stream.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Stream.TypeId (value)`

- **Source:** `packages/effect/src/Stream.ts:93`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier stored on `Stream` values and used by `isStream` to recognize them.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Stream } from "effect"` and use `Stream.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Stream.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Stream.Variance`

- **Source:** `packages/effect/src/Stream.ts:183`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `Stream`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Stream.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Stream.VarianceStruct`

- **Source:** `packages/effect/src/Stream.ts:198`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Structural encoding used by `Variance` to record each `Stream` type parameter's variance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Stream.VarianceStruct` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
