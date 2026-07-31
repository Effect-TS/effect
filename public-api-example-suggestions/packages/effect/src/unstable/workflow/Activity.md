# Example Suggestions: `effect/unstable/workflow/Activity`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/workflow/Activity.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 4 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/workflow/Activity.make`           |  123 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Activity.raceAll`        |  271 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Activity.retry`          |  210 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Activity.idempotencyKey` |  246 | `root-declaration` | **recommended** |
| `effect/unstable/workflow/Activity.CurrentAttempt` |  234 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Activity.Activity`       |   36 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Activity.Any`            |   94 | `root-declaration` | **optional**    |
| `effect/unstable/workflow/Activity.AnyWithProps`   |  108 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/workflow/Activity.make`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:123`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a workflow activity from an effect, using the provided schemas to encode successes and failures for durable execution.
- **Signature hint:** `declare function make<R, Success extends Schema.Constraint = Schema.Void, Error extends Schema.Constraint = Schema.Never>(options: { readonly name: string; readonly success?: Success | undefined; readonly error?: Error | undefined; readonly execute: Effect.Effect<Success['Type'], Error['Type'], R>; readonly interruptRetryPolicy?: Schedule.Schedule<any, Cause.Cause<unknown>> | undefined; readonly annotations?: Context.Context<never> | undefined; }): Activity<Success, Error, Exclude<R, WorkflowInstance | WorkflowEngine | Scope>>`
- **Import guidance:** Start from `import { Activity } from "effect/unstable/workflow"` and use `Activity.make`.
- **Suggested snippet:** Construct one representative value with `Activity.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Activity.raceAll`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:271`
- **Kind / category:** `root-declaration` / `racing`
- **Priority:** **recommended**
- **Current description:** Runs a non-empty collection of activities as a durable race and returns the first completed success or failure using unioned success and error schemas.
- **Signature hint:** `declare function raceAll<const Activities extends NonEmptyReadonlyArray<Any>>(name: string, activities: Activities): Effect.Effect<Activities[number] extends Activity<infer _A, infer _E, infer _R> ? _A['Type'] : never, Activities[number] extends Activity<infer _A, infer _E, infer _R> ? _E['Type'] : never, (Activities[number] extends Activity<infer Success, infer Error, infer R> ? Success['DecodingServices'] | Error['DecodingServices'] | R : never) | WorkflowEngine | WorkflowInstance>`
- **Import guidance:** Start from `import { Activity } from "effect/unstable/workflow"` and use `Activity.raceAll`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Activity.raceAll`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Activity.retry`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:210`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Retries an effect with `Effect.retry` while updating `CurrentAttempt` for each attempt.
- **Signature hint:** `declare function retry<E, O extends Types.NoExcessProperties<Omit<Effect.Retry.Options<E>, 'schedule'>, O>>(options: O): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Retry.Return<R, E, A, O> declare function retry<A, E, R, O extends Types.NoExcessProperties<Omit<Effect.Retry.Options<E>, 'schedule'>, O>>(self: Effect.Effect<A, E, R>, options: O): Effect.Retry.Return<R, E, A, O>`
- **Import guidance:** Start from `import { Activity } from "effect/unstable/workflow"` and use `Activity.retry`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Retries an effect with `Effect.retry` while updating `CurrentAttempt` for each attempt. Call `Activity.retry` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/workflow/Activity.idempotencyKey`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:246`
- **Kind / category:** `root-declaration` / `Idempotency`
- **Priority:** **recommended**
- **Current description:** Computes a deterministic activity idempotency key from the current workflow execution ID, the supplied name, and optionally the current attempt.
- **Signature hint:** `declare function idempotencyKey(name: string, options?: { readonly includeAttempt?: boolean | undefined; } | undefined): Effect.Effect<string, never, WorkflowInstance>`
- **Import guidance:** Start from `import { Activity } from "effect/unstable/workflow"` and use `Activity.idempotencyKey`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Activity.idempotencyKey`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/workflow/Activity.CurrentAttempt`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:234`
- **Kind / category:** `root-declaration` / `Attempts`
- **Priority:** **optional**
- **Current description:** Context reference containing the current activity retry attempt, defaulting to `1`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Activity } from "effect/unstable/workflow"` and use `Activity.CurrentAttempt`.
- **Suggested snippet:** Consume `Activity.CurrentAttempt` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Activity.Activity`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:36`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Durable workflow activity that behaves as an `Effect` and records its name, result schemas, annotations, and encoded execution form for the workflow engine.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Activity.Activity`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Activity.Any`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:94`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased activity shape for APIs that only need the activity identity, name, annotations, and encoded execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Activity.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/workflow/Activity.AnyWithProps`

- **Source:** `packages/effect/src/unstable/workflow/Activity.ts:108`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased activity shape that also exposes success and error schemas for derived workflow APIs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/workflow/Activity.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
