# Example Suggestions: `effect/Sink`

- **Package:** `effect`
- **Source:** `packages/effect/src/Sink.ts`
- **Uncovered API records:** 70
- **Priorities:** 1 required, 25 recommended, 42 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                  | Line | Kind                    | Priority        |
| ------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/Sink.ensuring`               | 2165 | `root-declaration`      | **required**    |
| `effect/Sink.fromTransform`          |  288 | `root-declaration`      | **recommended** |
| `effect/Sink.fromEffectEnd`          |  469 | `root-declaration`      | **recommended** |
| `effect/Sink.fromEffect`             |  484 | `root-declaration`      | **recommended** |
| `effect/Sink.drain`                  |  711 | `root-declaration`      | **recommended** |
| `effect/Sink.fold`                   |  740 | `root-declaration`      | **recommended** |
| `effect/Sink.foldArray`              |  784 | `root-declaration`      | **recommended** |
| `effect/Sink.foldUntil`              |  815 | `root-declaration`      | **recommended** |
| `effect/Sink.map`                    |  888 | `root-declaration`      | **recommended** |
| `effect/Sink.as`                     |  910 | `root-declaration`      | **recommended** |
| `effect/Sink.mapInput`               |  924 | `root-declaration`      | **recommended** |
| `effect/Sink.mapInputEffect`         |  939 | `root-declaration`      | **recommended** |
| `effect/Sink.mapInputArray`          |  962 | `root-declaration`      | **recommended** |
| `effect/Sink.mapInputArrayEffect`    |  985 | `root-declaration`      | **recommended** |
| `effect/Sink.mapEnd`                 | 1017 | `root-declaration`      | **recommended** |
| `effect/Sink.mapEffectEnd`           | 1052 | `root-declaration`      | **recommended** |
| `effect/Sink.mapEffect`              | 1085 | `root-declaration`      | **recommended** |
| `effect/Sink.mapError`               | 1104 | `root-declaration`      | **recommended** |
| `effect/Sink.mapLeftover`            | 1118 | `root-declaration`      | **recommended** |
| `effect/Sink.flatMap`                | 1191 | `root-declaration`      | **recommended** |
| `effect/Sink.reduceWhile`            | 1235 | `root-declaration`      | **recommended** |
| `effect/Sink.reduceWhileEffect`      | 1271 | `root-declaration`      | **recommended** |
| `effect/Sink.reduceWhileArray`       | 1312 | `root-declaration`      | **recommended** |
| `effect/Sink.reduceWhileArrayEffect` | 1344 | `root-declaration`      | **recommended** |
| `effect/Sink.reduce`                 | 1375 | `root-declaration`      | **recommended** |
| `effect/Sink.reduceArray`            | 1390 | `root-declaration`      | **recommended** |
| `effect/Sink.fromChannel`            |  221 | `root-declaration`      | **optional**    |
| `effect/Sink.make (value)`           |  338 | `root-declaration`      | **optional**    |
| `effect/Sink.fromQueue`              |  499 | `root-declaration`      | **optional**    |
| `effect/Sink.fromPubSub`             |  523 | `root-declaration`      | **optional**    |
| `effect/Sink.sync`                   |  555 | `root-declaration`      | **optional**    |
| `effect/Sink.suspend`                |  563 | `root-declaration`      | **optional**    |
| `effect/Sink.never`                  |  680 | `root-declaration`      | **optional**    |
| `effect/Sink.ignoreLeftover`         |  694 | `root-declaration`      | **optional**    |
| `effect/Sink.every`                  |  841 | `root-declaration`      | **optional**    |
| `effect/Sink.some`                   |  861 | `root-declaration`      | **optional**    |
| `effect/Sink.take`                   | 1138 | `root-declaration`      | **optional**    |
| `effect/Sink.reduceEffect`           | 1413 | `root-declaration`      | **optional**    |
| `effect/Sink.head`                   | 1432 | `root-declaration`      | **optional**    |
| `effect/Sink.last`                   | 1459 | `root-declaration`      | **optional**    |
| `effect/Sink.find`                   | 1481 | `root-declaration`      | **optional**    |
| `effect/Sink.findEffect`             | 1510 | `root-declaration`      | **optional**    |
| `effect/Sink.sum`                    | 1525 | `root-declaration`      | **optional**    |
| `effect/Sink.count`                  | 1542 | `root-declaration`      | **optional**    |
| `effect/Sink.collect`                | 1556 | `root-declaration`      | **optional**    |
| `effect/Sink.takeWhile`              | 1574 | `root-declaration`      | **optional**    |
| `effect/Sink.takeWhileFilter`        | 1611 | `root-declaration`      | **optional**    |
| `effect/Sink.takeWhileEffect`        | 1647 | `root-declaration`      | **optional**    |
| `effect/Sink.takeWhileFilterEffect`  | 1697 | `root-declaration`      | **optional**    |
| `effect/Sink.takeUntil`              | 1733 | `root-declaration`      | **optional**    |
| `effect/Sink.takeUntilEffect`        | 1754 | `root-declaration`      | **optional**    |
| `effect/Sink.forEachWhile`           | 1838 | `root-declaration`      | **optional**    |
| `effect/Sink.forEachWhileArray`      | 1861 | `root-declaration`      | **optional**    |
| `effect/Sink.summarized`             | 1907 | `root-declaration`      | **optional**    |
| `effect/Sink.withDuration`           | 1935 | `root-declaration`      | **optional**    |
| `effect/Sink.timed`                  | 1946 | `root-declaration`      | **optional**    |
| `effect/Sink.provideContext`         | 1959 | `root-declaration`      | **optional**    |
| `effect/Sink.provideService`         | 1988 | `root-declaration`      | **optional**    |
| `effect/Sink.orElse`                 | 2021 | `root-declaration`      | **optional**    |
| `effect/Sink.catchCause`             | 2074 | `root-declaration`      | **optional**    |
| `effect/Sink.catch`                  | 2123 | `root-declaration`      | **optional**    |
| `effect/Sink.onExit`                 | 2137 | `root-declaration`      | **optional**    |
| `effect/Sink.End`                    |   86 | `root-declaration`      | **optional**    |
| `effect/Sink.SinkUnify`              |  103 | `root-declaration`      | **optional**    |
| `effect/Sink.SinkUnifyIgnore`        |  128 | `root-declaration`      | **optional**    |
| `effect/Sink.Sink`                   |  137 | `namespace`             | **optional**    |
| `effect/Sink.make (type)`            |  354 | `namespace`             | **optional**    |
| `effect/Sink.make.Constructor`       |  367 | `namespace-declaration` | **optional**    |
| `effect/Sink.Sink.Variance`          |  150 | `namespace-declaration` | **discouraged** |
| `effect/Sink.Sink.VarianceStruct`    |  165 | `namespace-declaration` | **discouraged** |

## Required

### `effect/Sink.ensuring`

- **Source:** `packages/effect/src/Sink.ts:2165`
- **Kind / category:** `root-declaration` / `Finalization`
- **Priority:** **required**
- **Current description:** Runs a finalizer effect after this sink completes, fails, or is interrupted.
- **Signature hint:** `declare function ensuring<X, E2, R2>(effect: Effect.Effect<X, E2, R2>): <A, E, In, L, R>(self: Sink<A, In, L, E, R>) => Sink<A, In, L, E | E2, R2 | R> declare function ensuring<A, In, L, E, R, X, E2, R2>(self: Sink<A, In, L, E, R>, effect: Effect.Effect<X, E2, R2>): Sink<A, In, L, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.ensuring`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs a finalizer effect after this sink completes, fails, or is interrupted. Call `Sink.ensuring` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/Sink.fromTransform`

- **Source:** `packages/effect/src/Sink.ts:288`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Sink` from a low-level transform function.
- **Signature hint:** `declare function fromTransform<In, A, E, R, L = never>(transform: (upstream: Pull.Pull<NonEmptyReadonlyArray<In>, never, void>, scope: Scope.Scope) => Effect.Effect<End<A, L>, E, R>): Sink<A, In, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.fromTransform`.
- **Suggested snippet:** Convert one representative external input with `Sink.fromTransform` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.fromEffectEnd`

- **Source:** `packages/effect/src/Sink.ts:469`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a sink that ignores upstream input and completes from an effect that already returns an `End`.
- **Signature hint:** `declare function fromEffectEnd<A, E, R, L = never>(effect: Effect.Effect<End<A, L>, E, R>): Sink<A, unknown, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.fromEffectEnd`.
- **Suggested snippet:** Convert one representative external input with `Sink.fromEffectEnd` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.fromEffect`

- **Source:** `packages/effect/src/Sink.ts:484`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a sink that ignores upstream input and completes with the success value of the provided effect.
- **Signature hint:** `declare function fromEffect<A, E, R>(effect: Effect.Effect<A, E, R>): Sink<A, unknown, never, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.fromEffect`.
- **Suggested snippet:** Convert one representative external input with `Sink.fromEffect` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.drain`

- **Source:** `packages/effect/src/Sink.ts:711`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Consumes and ignores all stream inputs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.drain`.
- **Suggested snippet:** Use `Sink.drain` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.fold`

- **Source:** `packages/effect/src/Sink.ts:740`
- **Kind / category:** `root-declaration` / `folding`
- **Priority:** **recommended**
- **Current description:** A sink that folds its inputs with the provided function, termination predicate and initial state.
- **Signature hint:** `declare function fold<S, In, E = never, R = never>(s: LazyArg<S>, contFn: Predicate<S>, f: (s: S, input: In) => Effect.Effect<S, E, R>): Sink<S, In, In, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.fold`.
- **Suggested snippet:** Create one value for each meaningful branch handled by `Sink.fold`, invoke the matcher or fold directly, and assert the distinct branch results with minimal callbacks.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.foldArray`

- **Source:** `packages/effect/src/Sink.ts:784`
- **Kind / category:** `root-declaration` / `folding`
- **Priority:** **recommended**
- **Current description:** Folds non-empty input arrays into state with an effectful function.
- **Signature hint:** `declare function foldArray<S, In, E = never, R = never>(s: LazyArg<S>, contFn: Predicate<S>, f: (s: S, input: Arr.NonEmptyReadonlyArray<In>) => Effect.Effect<S, E, R>): Sink<S, In, never, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.foldArray`.
- **Suggested snippet:** Create one value for each meaningful branch handled by `Sink.foldArray`, invoke the matcher or fold directly, and assert the distinct branch results with minimal callbacks.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.foldUntil`

- **Source:** `packages/effect/src/Sink.ts:815`
- **Kind / category:** `root-declaration` / `folding`
- **Priority:** **recommended**
- **Current description:** Folds input elements into state until the specified maximum number of elements has been consumed or the upstream stream ends.
- **Signature hint:** `declare function foldUntil<S, In, E = never, R = never>(s: LazyArg<S>, max: number, f: (s: S, input: In) => Effect.Effect<S, E, R>): Sink<S, In, In, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.foldUntil`.
- **Suggested snippet:** Create one value for each meaningful branch handled by `Sink.foldUntil`, invoke the matcher or fold directly, and assert the distinct branch results with minimal callbacks.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.map`

- **Source:** `packages/effect/src/Sink.ts:888`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms this sink's result.
- **Signature hint:** `declare function map<A, A2>(f: (a: A) => A2): <In, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A2, In, L, E, R> declare function map<A, In, L, E, R, A2>(self: Sink<A, In, L, E, R>, f: (a: A) => A2): Sink<A2, In, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.map`.
- **Suggested snippet:** Apply `Sink.map` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.as`

- **Source:** `packages/effect/src/Sink.ts:910`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Sets the sink's result to a constant value.
- **Signature hint:** `declare function as<A2>(a2: A2): <A, In, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A2, In, L, E, R> declare function as<A, In, L, E, R, A2>(self: Sink<A, In, L, E, R>, a2: A2): Sink<A2, In, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.as`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the sink's result to a constant value. Call `Sink.as` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapInput`

- **Source:** `packages/effect/src/Sink.ts:924`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms this sink's input elements.
- **Signature hint:** `declare function mapInput<In0, In>(f: (input: In0) => In): <A, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A, In0, L, E, R> declare function mapInput<A, In, L, E, R, In0>(self: Sink<A, In, L, E, R>, f: (input: In0) => In): Sink<A, In0, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapInput`.
- **Suggested snippet:** Apply `Sink.mapInput` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapInputEffect`

- **Source:** `packages/effect/src/Sink.ts:939`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms this sink's input elements effectfully.
- **Signature hint:** `declare function mapInputEffect<In0, In, E2, R2>(f: (input: In0) => Effect.Effect<In, E2, R2>): <A, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A, In0, L, E2 | E, R2 | R> declare function mapInputEffect<A, In, L, E, R, In0, E2, R2>(self: Sink<A, In, L, E, R>, f: (input: In0) => Effect.Effect<In, E2, R2>): Sink<A, In0, L, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapInputEffect`.
- **Suggested snippet:** Apply `Sink.mapInputEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapInputArray`

- **Source:** `packages/effect/src/Sink.ts:962`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms each non-empty array of upstream input before it is fed to this sink.
- **Signature hint:** `declare function mapInputArray<In0, In>(f: (input: Arr.NonEmptyReadonlyArray<In0>) => Arr.NonEmptyReadonlyArray<In>): <A, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A, In0, L, E, R> declare function mapInputArray<A, In, L, E, R, In0>(self: Sink<A, In, L, E, R>, f: (input: Arr.NonEmptyReadonlyArray<In0>) => Arr.NonEmptyReadonlyArray<In>): Sink<A, In0, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapInputArray`.
- **Suggested snippet:** Apply `Sink.mapInputArray` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapInputArrayEffect`

- **Source:** `packages/effect/src/Sink.ts:985`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms each non-empty array of upstream input effectfully before it is fed to this sink.
- **Signature hint:** `declare function mapInputArrayEffect<In0, In, E2, R2>(f: (input: Arr.NonEmptyReadonlyArray<In0>) => Effect.Effect<Arr.NonEmptyReadonlyArray<In>, E2, R2>): <A, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A, In0, L, E2 | E, R2 | R> declare function mapInputArrayEffect<A, In, L, E, R, In0, E2, R2>(self: Sink<A, In, L, E, R>, f: (input: Arr.NonEmptyReadonlyArray<In0>) => Effect.Effect<Arr.NonEmptyReadonlyArray<In>, E2, R2>): Sink<A, In0, L, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapInputArrayEffect`.
- **Suggested snippet:** Apply `Sink.mapInputArrayEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapEnd`

- **Source:** `packages/effect/src/Sink.ts:1017`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms the full `End` produced by this sink.
- **Signature hint:** `declare function mapEnd<A, L, A2, L2 = never>(f: (a: End<A, L>) => End<A2, L2>): <In, E, R>(self: Sink<A, In, L, E, R>) => Sink<A2, In, L2, E, R> declare function mapEnd<A, In, L, E, R, A2, L2 = never>(self: Sink<A, In, L, E, R>, f: (a: End<A, L>) => End<A2, L2>): Sink<A2, In, L2, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapEnd`.
- **Suggested snippet:** Apply `Sink.mapEnd` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapEffectEnd`

- **Source:** `packages/effect/src/Sink.ts:1052`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms the full `End` produced by this sink effectfully.
- **Signature hint:** `declare function mapEffectEnd<A, L, A2, E2, R2, L2 = never>(f: (end: End<A, L>) => Effect.Effect<End<A2, L2>, E2, R2>): <In, E, R>(self: Sink<A, In, L, E, R>) => Sink<A2, In, L2, E2 | E, R2 | R> declare function mapEffectEnd<A, In, L, E, R, A2, E2, R2, L2 = never>(self: Sink<A, In, L, E, R>, f: (end: End<A, L>) => Effect.Effect<End<A2, L2>, E2, R2>): Sink<A2, In, L2, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapEffectEnd`.
- **Suggested snippet:** Apply `Sink.mapEffectEnd` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapEffect`

- **Source:** `packages/effect/src/Sink.ts:1085`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms this sink's result effectfully.
- **Signature hint:** `declare function mapEffect<A, A2, E2, R2>(f: (a: A) => Effect.Effect<A2, E2, R2>): <In, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A2, In, L, E2 | E, R2 | R> declare function mapEffect<A, In, L, E, R, A2, E2, R2>(self: Sink<A, In, L, E, R>, f: (a: A) => Effect.Effect<A2, E2, R2>): Sink<A2, In, L, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapEffect`.
- **Suggested snippet:** Apply `Sink.mapEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapError`

- **Source:** `packages/effect/src/Sink.ts:1104`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms the errors emitted by this sink using `f`.
- **Signature hint:** `declare function mapError<E, E2>(f: (error: E) => E2): <A, In, L, R>(self: Sink<A, In, L, E, R>) => Sink<A, In, L, E2, R> declare function mapError<A, In, L, E, R, E2>(self: Sink<A, In, L, E, R>, f: (error: E) => E2): Sink<A, In, L, E2, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapError`.
- **Suggested snippet:** Create or capture `Sink.mapError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.mapLeftover`

- **Source:** `packages/effect/src/Sink.ts:1118`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms the leftovers emitted by this sink using `f`.
- **Signature hint:** `declare function mapLeftover<L, L2>(f: (leftover: L) => L2): <A, In, E, R>(self: Sink<A, In, L, E, R>) => Sink<A, In, L2, E, R> declare function mapLeftover<A, In, L, E, R, L2>(self: Sink<A, In, L, E, R>, f: (leftover: L) => L2): Sink<A, In, L2, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.mapLeftover`.
- **Suggested snippet:** Apply `Sink.mapLeftover` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.flatMap`

- **Source:** `packages/effect/src/Sink.ts:1191`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Runs this sink until it yields a result, then uses that result to create another sink from the provided function which will continue to run until it yields a result.
- **Signature hint:** `declare function flatMap<A, A1, L, In1 extends L, L1, E1, R1>(f: (a: A) => Sink<A1, In1, L1, E1, R1>): <In, E, R>(self: Sink<A, In, L, E, R>) => Sink<A1, In & In1, L1 | L, E1 | E, R1 | R> declare function flatMap<A, In, L, E, R, A1, In1 extends L, L1, E1, R1>(self: Sink<A, In, L, E, R>, f: (a: A) => Sink<A1, In1, L1, E1, R1>): Sink<A1, In & In1, L | L1, E | E1, R | R1>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.flatMap`.
- **Suggested snippet:** Apply `Sink.flatMap` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.reduceWhile`

- **Source:** `packages/effect/src/Sink.ts:1235`
- **Kind / category:** `root-declaration` / `reducing`
- **Priority:** **recommended**
- **Current description:** A sink that reduces input elements from the provided `initial` state with `f` while the specified `predicate` returns `true`.
- **Signature hint:** `declare function reduceWhile<S, In>(initial: LazyArg<S>, predicate: Predicate<S>, f: (s: S, input: In) => S): Sink<S, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.reduceWhile`.
- **Suggested snippet:** Apply `Sink.reduceWhile` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.reduceWhileEffect`

- **Source:** `packages/effect/src/Sink.ts:1271`
- **Kind / category:** `root-declaration` / `reducing`
- **Priority:** **recommended**
- **Current description:** A sink that effectfully reduces input elements from the provided `initial` state with `f` while the specified `predicate` returns `true`.
- **Signature hint:** `declare function reduceWhileEffect<S, In, E, R>(initial: LazyArg<S>, predicate: Predicate<S>, f: (s: S, input: In) => Effect.Effect<S, E, R>): Sink<S, In, In, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.reduceWhileEffect`.
- **Suggested snippet:** Apply `Sink.reduceWhileEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.reduceWhileArray`

- **Source:** `packages/effect/src/Sink.ts:1312`
- **Kind / category:** `root-declaration` / `reducing`
- **Priority:** **recommended**
- **Current description:** A sink that reduces non-empty input arrays from the provided `initial` state with `f` while the specified `predicate` returns `true`.
- **Signature hint:** `declare function reduceWhileArray<S, In>(initial: LazyArg<S>, contFn: Predicate<S>, f: (s: S, input: NonEmptyReadonlyArray<In>) => S): Sink<S, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.reduceWhileArray`.
- **Suggested snippet:** Apply `Sink.reduceWhileArray` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.reduceWhileArrayEffect`

- **Source:** `packages/effect/src/Sink.ts:1344`
- **Kind / category:** `root-declaration` / `reducing`
- **Priority:** **recommended**
- **Current description:** A sink that effectfully reduces non-empty input arrays from the provided `initial` state with `f` while the specified `predicate` returns `true`.
- **Signature hint:** `declare function reduceWhileArrayEffect<S, In, E, R>(initial: LazyArg<S>, predicate: Predicate<S>, f: (s: S, input: NonEmptyReadonlyArray<In>) => Effect.Effect<S, E, R>): Sink<S, In, never, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.reduceWhileArrayEffect`.
- **Suggested snippet:** Apply `Sink.reduceWhileArrayEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.reduce`

- **Source:** `packages/effect/src/Sink.ts:1375`
- **Kind / category:** `root-declaration` / `reducing`
- **Priority:** **recommended**
- **Current description:** A sink that reduces its inputs using the provided function `f` starting from the provided `initial` state.
- **Signature hint:** `declare function reduce<S, In>(initial: LazyArg<S>, f: (s: S, input: In) => S): Sink<S, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.reduce`.
- **Suggested snippet:** Apply `Sink.reduce` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Sink.reduceArray`

- **Source:** `packages/effect/src/Sink.ts:1390`
- **Kind / category:** `root-declaration` / `reducing`
- **Priority:** **recommended**
- **Current description:** A sink that reduces its inputs using the provided function `f` starting from the specified `initial` state.
- **Signature hint:** `declare function reduceArray<S, In>(initial: LazyArg<S>, f: (s: S, input: NonEmptyReadonlyArray<In>) => S): Sink<S, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.reduceArray`.
- **Suggested snippet:** Apply `Sink.reduceArray` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Sink.fromChannel`

- **Source:** `packages/effect/src/Sink.ts:221`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink from a `Channel`.
- **Signature hint:** `declare function fromChannel<L, In, E, A, R>(channel: Channel.Channel<never, E, End<A, L>, NonEmptyReadonlyArray<In>, never, void, R>): Sink<A, In, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.fromChannel`.
- **Suggested snippet:** Convert one representative external input with `Sink.fromChannel` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.make (value)`

- **Source:** `packages/effect/src/Sink.ts:338`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a pipe-style constructor for sinks over input type `In`.
- **Signature hint:** `declare function make<In>(): make.Constructor<In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.make`.
- **Suggested snippet:** Construct one representative value with `Sink.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.fromQueue`

- **Source:** `packages/effect/src/Sink.ts:499`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink that offers every consumed input element to a queue.
- **Signature hint:** `declare function fromQueue<A>(queue: Queue.Queue<A, Cause.Done>): Sink<void, A>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.fromQueue`.
- **Suggested snippet:** Convert one representative external input with `Sink.fromQueue` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.fromPubSub`

- **Source:** `packages/effect/src/Sink.ts:523`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink that publishes every consumed input element to a `PubSub`.
- **Signature hint:** `declare function fromPubSub<A>(pubsub: PubSub.PubSub<A>): Sink<void, A>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.fromPubSub`.
- **Suggested snippet:** Convert one representative external input with `Sink.fromPubSub` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.sync`

- **Source:** `packages/effect/src/Sink.ts:555`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** A sink that immediately ends with the specified lazily evaluated value.
- **Signature hint:** `declare function sync<A>(a: LazyArg<A>): Sink<A>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.sync`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A sink that immediately ends with the specified lazily evaluated value. Call `Sink.sync` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.suspend`

- **Source:** `packages/effect/src/Sink.ts:563`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** A sink that is created from a lazily evaluated sink.
- **Signature hint:** `declare function suspend<A, In, L, E, R>(evaluate: LazyArg<Sink<A, In, L, E, R>>): Sink<A, In, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.suspend`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A sink that is created from a lazily evaluated sink. Call `Sink.suspend` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.never`

- **Source:** `packages/effect/src/Sink.ts:680`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** A sink that never completes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.never`.
- **Suggested snippet:** Use `Sink.never` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.ignoreLeftover`

- **Source:** `packages/effect/src/Sink.ts:694`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **optional**
- **Current description:** Drops leftovers produced by a sink.
- **Signature hint:** `declare function ignoreLeftover<A, In, L, E, R>(self: Sink<A, In, L, E, R>): Sink<A, In, never, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.ignoreLeftover`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Drops leftovers produced by a sink. Call `Sink.ignoreLeftover` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.every`

- **Source:** `packages/effect/src/Sink.ts:841`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** A sink that returns whether all elements satisfy the specified predicate.
- **Signature hint:** `declare function every<In>(predicate: Predicate<In>): Sink<boolean, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.every`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A sink that returns whether all elements satisfy the specified predicate. Call `Sink.every` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.some`

- **Source:** `packages/effect/src/Sink.ts:861`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** A sink that returns whether an element satisfies the specified predicate.
- **Signature hint:** `declare function some<In>(predicate: Predicate<In>): Sink<boolean, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.some`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: A sink that returns whether an element satisfies the specified predicate. Call `Sink.some` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.take`

- **Source:** `packages/effect/src/Sink.ts:1138`
- **Kind / category:** `root-declaration` / `collecting`
- **Priority:** **optional**
- **Current description:** Collects up to `n` input elements into an array.
- **Signature hint:** `declare function take<In>(n: number): Sink<Array<In>, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.take`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Collects up to `n` input elements into an array. Call `Sink.take` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.reduceEffect`

- **Source:** `packages/effect/src/Sink.ts:1413`
- **Kind / category:** `root-declaration` / `reducing`
- **Priority:** **optional**
- **Current description:** A sink that reduces its inputs using the provided effectful function `f` starting from the specified `initial` state.
- **Signature hint:** `declare function reduceEffect<S, In, E, R>(initial: LazyArg<S>, f: (s: S, input: In) => Effect.Effect<S, E, R>): Sink<S, In, never, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.reduceEffect`.
- **Suggested snippet:** Apply `Sink.reduceEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.head`

- **Source:** `packages/effect/src/Sink.ts:1432`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink containing the first value.
- **Signature hint:** `declare function head<In>(): Sink<Option.Option<In>, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.head`.
- **Suggested snippet:** Create a small representative input, call `Sink.head`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.last`

- **Source:** `packages/effect/src/Sink.ts:1459`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink containing the last value.
- **Signature hint:** `declare function last<In>(): Sink<Option.Option<In>, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.last`.
- **Suggested snippet:** Create a small representative input, call `Sink.last`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.find`

- **Source:** `packages/effect/src/Sink.ts:1481`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink containing the first value matched by a synchronous predicate.
- **Signature hint:** `declare function find<In, Out extends In>(refinement: Refinement<In, Out>): Sink<Option.Option<Out>, In, In> declare function find<In>(predicate: Predicate<In>): Sink<Option.Option<In>, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.find`.
- **Suggested snippet:** Create a small representative input, call `Sink.find`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.findEffect`

- **Source:** `packages/effect/src/Sink.ts:1510`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink containing the first value matched by an effectful predicate.
- **Signature hint:** `declare function findEffect<In, E, R>(predicate: (input: In) => Effect.Effect<boolean, E, R>): Sink<Option.Option<In>, In, In, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.findEffect`.
- **Suggested snippet:** Create a small representative input, call `Sink.findEffect`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.sum`

- **Source:** `packages/effect/src/Sink.ts:1525`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a sink which sums up its inputs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.sum`.
- **Suggested snippet:** Use `Sink.sum` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.count`

- **Source:** `packages/effect/src/Sink.ts:1542`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** A sink that counts the number of elements fed to it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.count`.
- **Suggested snippet:** Use `Sink.count` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.collect`

- **Source:** `packages/effect/src/Sink.ts:1556`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Accumulates incoming elements into an array.
- **Signature hint:** `declare function collect<In>(): Sink<Array<In>, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.collect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Accumulates incoming elements into an array. Call `Sink.collect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.takeWhile`

- **Source:** `packages/effect/src/Sink.ts:1574`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Collects the longest input prefix whose elements satisfy the predicate or refinement.
- **Signature hint:** `declare function takeWhile<In, Out extends In>(refinement: Refinement<In, Out>): Sink<Array<Out>, In, In> declare function takeWhile<In>(predicate: Predicate<In>): Sink<Array<In>, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.takeWhile`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Collects the longest input prefix whose elements satisfy the predicate or refinement. Call `Sink.takeWhile` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.takeWhileFilter`

- **Source:** `packages/effect/src/Sink.ts:1611`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Applies a `Filter` to input elements while it succeeds, collecting each successful output.
- **Signature hint:** `declare function takeWhileFilter<In, Out, X>(filter: Filter.Filter<In, Out, X>): Sink<Array<Out>, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.takeWhileFilter`.
- **Suggested snippet:** Use a callback that succeeds for initial values and fails at one clear boundary, apply `Sink.takeWhileFilter`, and assert the resulting collection so the take/drop boundary is visible. The callback's `Result` is control flow, not the API output.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.takeWhileEffect`

- **Source:** `packages/effect/src/Sink.ts:1647`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Collects input elements effectfully while the predicate succeeds.
- **Signature hint:** `declare function takeWhileEffect<In, E, R>(predicate: (input: In) => Effect.Effect<boolean, E, R>): Sink<Array<In>, In, In, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.takeWhileEffect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Collects input elements effectfully while the predicate succeeds. Call `Sink.takeWhileEffect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.takeWhileFilterEffect`

- **Source:** `packages/effect/src/Sink.ts:1697`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Applies a `FilterEffect` to input elements effectfully while it succeeds, collecting each successful output.
- **Signature hint:** `declare function takeWhileFilterEffect<In, Out, X, E, R>(filter: Filter.FilterEffect<In, Out, X, E, R>): Sink<Array<Out>, In, In, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.takeWhileFilterEffect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Applies a `FilterEffect` to input elements effectfully while it succeeds, collecting each successful output. Call `Sink.takeWhileFilterEffect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.takeUntil`

- **Source:** `packages/effect/src/Sink.ts:1733`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Collects input elements until the predicate returns `true`, including the matching element in the result.
- **Signature hint:** `declare function takeUntil<In>(predicate: Predicate<In>): Sink<Array<In>, In, In>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.takeUntil`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Collects input elements until the predicate returns `true`, including the matching element in the result. Call `Sink.takeUntil` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.takeUntilEffect`

- **Source:** `packages/effect/src/Sink.ts:1754`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Collects input elements effectfully until the predicate returns `true`, including the matching element in the result.
- **Signature hint:** `declare function takeUntilEffect<In, E, R>(predicate: (input: In) => Effect.Effect<boolean, E, R>): Sink<Array<In>, In, In, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.takeUntilEffect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Collects input elements effectfully until the predicate returns `true`, including the matching element in the result. Call `Sink.takeUntilEffect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.forEachWhile`

- **Source:** `packages/effect/src/Sink.ts:1838`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Runs an effectful function for each input element while it returns `true`.
- **Signature hint:** `declare function forEachWhile<In, E, R>(f: (input: In) => Effect.Effect<boolean, E, R>): Sink<void, In, never, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.forEachWhile`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs an effectful function for each input element while it returns `true`. Call `Sink.forEachWhile` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.forEachWhileArray`

- **Source:** `packages/effect/src/Sink.ts:1861`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Runs an effectful function for each non-empty input array while it returns `true`.
- **Signature hint:** `declare function forEachWhileArray<In, E, R>(f: (input: NonEmptyReadonlyArray<In>) => Effect.Effect<boolean, E, R>): Sink<void, In, never, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.forEachWhileArray`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs an effectful function for each non-empty input array while it returns `true`. Call `Sink.forEachWhileArray` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.summarized`

- **Source:** `packages/effect/src/Sink.ts:1907`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **optional**
- **Current description:** Runs a summary effect when the sink starts and again when it completes.
- **Signature hint:** `declare function summarized<A2, E2, R2, A3>(summary: Effect.Effect<A2, E2, R2>, f: (start: A2, end: A2) => A3): <A, In, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<[A, A3], In, L, E2 | E, R2 | R> declare function summarized<A, In, L, E, R, A2, E2, R2, A3>(self: Sink<A, In, L, E, R>, summary: Effect.Effect<A2, E2, R2>, f: (start: A2, end: A2) => A3): Sink<[A, A3], In, L, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.summarized`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs a summary effect when the sink starts and again when it completes. Call `Sink.summarized` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.withDuration`

- **Source:** `packages/effect/src/Sink.ts:1935`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **optional**
- **Current description:** Returns the sink that executes this one and times its execution.
- **Signature hint:** `declare function withDuration<A, In, L, E, R>(self: Sink<A, In, L, E, R>): Sink<[A, Duration.Duration], In, L, E, R>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.withDuration`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the sink that executes this one and times its execution. Call `Sink.withDuration` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.timed`

- **Source:** `packages/effect/src/Sink.ts:1946`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** A sink that drains all input and returns the elapsed duration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.timed`.
- **Suggested snippet:** Use `Sink.timed` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.provideContext`

- **Source:** `packages/effect/src/Sink.ts:1959`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Provides a `Context` to this sink.
- **Signature hint:** `declare function provideContext<Provided>(context: Context.Context<Provided>): <A, In, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A, In, L, E, Exclude<R, Provided>> declare function provideContext<A, In, L, E, R, Provided>(self: Sink<A, In, L, E, R>, context: Context.Context<Provided>): Sink<A, In, L, E, Exclude<R, Provided>>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.provideContext`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides a `Context` to this sink. Call `Sink.provideContext` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.provideService`

- **Source:** `packages/effect/src/Sink.ts:1988`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Provides a single service implementation to this sink.
- **Signature hint:** `declare function provideService<I, S>(key: Context.Key<I, S>, value: Types.NoInfer<S>): <A, In, L, E, R>(self: Sink<A, In, L, E, R>) => Sink<A, In, L, E, Exclude<R, I>> declare function provideService<A, In, L, E, R, I, S>(self: Sink<A, In, L, E, R>, key: Context.Key<I, S>, value: Types.NoInfer<S>): Sink<A, In, L, E, Exclude<R, I>>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.provideService`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides a single service implementation to this sink. Call `Sink.provideService` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.orElse`

- **Source:** `packages/effect/src/Sink.ts:2021`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Runs a fallback sink if this sink fails with a typed error.
- **Signature hint:** `declare function orElse<E, A2, In2, L2, E2, R2>(f: (error: Types.NoInfer<E>) => Sink<A2, In2, L2, E2, R2>): <A, In, L, R>(self: Sink<A, In, L, E, R>) => Sink<A2 | A, In & In2, L2 | L, E2 | E, R2 | R> declare function orElse<A, In, L, E, R, A2, In2, L2, E2, R2>(self: Sink<A, In, L, E, R>, f: (error: E) => Sink<A2, In2, L2, E2, R2>): Sink<A | A2, In & In2, L | L2, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.orElse`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs a fallback sink if this sink fails with a typed error. Call `Sink.orElse` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.catchCause`

- **Source:** `packages/effect/src/Sink.ts:2074`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Handles failures from this sink by inspecting the full `Cause`.
- **Signature hint:** `declare function catchCause<E, A2, E2, R2>(f: (error: Cause.Cause<Types.NoInfer<E>>) => Effect.Effect<A2, E2, R2>): <A, In, L, R>(self: Sink<A, In, L, E, R>) => Sink<A2 | A, In, L, E, R2 | R> declare function catchCause<A, In, L, E, R, A2, E2, R2>(self: Sink<A, In, L, E, R>, f: (error: Cause.Cause<E>) => Effect.Effect<A2, E2, R2>): Sink<A | A2, In, L, E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.catchCause`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Handles failures from this sink by inspecting the full `Cause`. Call `Sink.catchCause` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.catch`

- **Source:** `packages/effect/src/Sink.ts:2123`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Handles typed errors from this sink with an effectful fallback value.
- **Signature hint:** `declare const _catch: { <E, A2, E2, R2>(f: (error: Types.NoInfer<E>) => Effect.Effect<A2, E2, R2>): <A, In, L, R>(self: Sink<A, In, L, E, R>) => Sink<A2 | A, In, L, E, R2 | R>; <A, In, L, E, R, A2, E2, R2>(self: Sink<A, In, L, E, R>, f: (error: E) => Effect.Effect<A2, E2, R2>): Sink<A | A2, In, L, E2, R | R2>; } export { _catch as catch }`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.catch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Handles typed errors from this sink with an effectful fallback value. Call `Sink.catch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.onExit`

- **Source:** `packages/effect/src/Sink.ts:2137`
- **Kind / category:** `root-declaration` / `Finalization`
- **Priority:** **optional**
- **Current description:** Runs an effect after this sink completes, fails, or is interrupted.
- **Signature hint:** `declare function onExit<A, E, X, E2, R2>(f: (exit: Exit.Exit<A, E>) => Effect.Effect<X, E2, R2>): <In, L, R>(self: Sink<A, In, L, E, R>) => Sink<A, In, L, E | E2, R2 | R> declare function onExit<A, In, L, E, R, X, E2, R2>(self: Sink<A, In, L, E, R>, f: (exit: Exit.Exit<A, E>) => Effect.Effect<X, E2, R2>): Sink<A, In, L, E | E2, R | R2>`
- **Import guidance:** Start from `import { Sink } from "effect"` and use `Sink.onExit`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs an effect after this sink completes, fails, or is interrupted. Call `Sink.onExit` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.End`

- **Source:** `packages/effect/src/Sink.ts:86`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tuple returned when a `Sink` finishes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Sink.End`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.SinkUnify`

- **Source:** `packages/effect/src/Sink.ts:103`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level unification support for `Sink` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Sink.SinkUnify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.SinkUnifyIgnore`

- **Source:** `packages/effect/src/Sink.ts:128`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker used by Effect's `Unify` machinery for `Sink` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Sink.SinkUnifyIgnore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.Sink`

- **Source:** `packages/effect/src/Sink.ts:137`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing types and interfaces for Sink variance and type relationships.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Sink.Sink`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.make (type)`

- **Source:** `packages/effect/src/Sink.ts:354`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing overload types for the pipe-style sink constructor returned by `Sink.make`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Sink.make`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Sink.make.Constructor`

- **Source:** `packages/effect/src/Sink.ts:367`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Overloaded function type returned by `Sink.make`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Sink.make.Constructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Sink.Sink.Variance`

- **Source:** `packages/effect/src/Sink.ts:150`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `Sink`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Sink.Sink.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Sink.Sink.VarianceStruct`

- **Source:** `packages/effect/src/Sink.ts:165`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Structural encoding used by `Sink.Variance` to record each `Sink` type parameter's variance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Sink.Sink.VarianceStruct` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
