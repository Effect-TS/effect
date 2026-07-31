# Example Suggestions: `effect/unstable/reactivity/Reactivity`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 7 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/reactivity/Reactivity.query`      |  252 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Reactivity.stream`     |  279 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Reactivity.layer`      |  317 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Reactivity.Reactivity` |   41 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Reactivity.make`       |   79 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Reactivity.mutation`   |  228 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Reactivity.invalidate` |  307 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/reactivity/Reactivity.query`

- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts:252`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Runs an effect as a query tied to the supplied invalidation keys.
- **Signature hint:** `declare function query(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Queue.Dequeue<A, E>, never, R | Scope.Scope | Reactivity> declare function query<A, E, R>(effect: Effect.Effect<A, E, R>, keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): Effect.Effect<Queue.Dequeue<A, E>, never, R | Scope.Scope | Reactivity>`
- **Import guidance:** Start from `import { Reactivity } from "effect/unstable/reactivity"` and use `Reactivity.query`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Reactivity.query`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Reactivity.stream`

- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts:279`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Runs an effect as a stream of query results tied to the supplied invalidation keys.
- **Signature hint:** `declare function stream(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Stream.Stream<A, E, Exclude<R, Scope.Scope> | Reactivity> declare function stream<A, E, R>(effect: Effect.Effect<A, E, R>, keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Reactivity>`
- **Import guidance:** Start from `import { Reactivity } from "effect/unstable/reactivity"` and use `Reactivity.stream`.
- **Suggested snippet:** Create a finite stream, apply `Reactivity.stream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Reactivity.layer`

- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts:317`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** The default layer that provides an in-memory `Reactivity` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reactivity } from "effect/unstable/reactivity"` and use `Reactivity.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Reactivity.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Reactivity.Reactivity`

- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts:41`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for key-based reactive invalidation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reactivity } from "effect/unstable/reactivity"` and use `Reactivity.Reactivity`.
- **Suggested snippet:** Consume `Reactivity.Reactivity` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Reactivity.make`

- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts:79`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an in-memory `Reactivity` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reactivity } from "effect/unstable/reactivity"` and use `Reactivity.make`.
- **Suggested snippet:** Construct one representative value with `Reactivity.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Reactivity.mutation`

- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts:228`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Wraps an effect so the supplied keys are invalidated after the effect succeeds.
- **Signature hint:** `declare function mutation(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | Reactivity> declare function mutation<A, E, R>(effect: Effect.Effect<A, E, R>, keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): Effect.Effect<A, E, R | Reactivity>`
- **Import guidance:** Start from `import { Reactivity } from "effect/unstable/reactivity"` and use `Reactivity.mutation`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Reactivity.mutation`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Reactivity.invalidate`

- **Source:** `packages/effect/src/unstable/reactivity/Reactivity.ts:307`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Invalidates the supplied keys through the `Reactivity` service.
- **Signature hint:** `declare function invalidate(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): Effect.Effect<void, never, Reactivity>`
- **Import guidance:** Start from `import { Reactivity } from "effect/unstable/reactivity"` and use `Reactivity.invalidate`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Reactivity.invalidate`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
