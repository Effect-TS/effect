# Example Suggestions: `effect/Request`

- **Package:** `effect`
- **Source:** `packages/effect/src/Request.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 6 recommended, 3 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                               | Line | Kind               | Priority        |
| --------------------------------- | ---: | ------------------ | --------------- |
| `effect/Request.complete`         |  436 | `root-declaration` | **recommended** |
| `effect/Request.completeEffect`   |  470 | `root-declaration` | **recommended** |
| `effect/Request.fail`             |  498 | `root-declaration` | **recommended** |
| `effect/Request.failCause`        |  522 | `root-declaration` | **recommended** |
| `effect/Request.succeed`          |  547 | `root-declaration` | **recommended** |
| `effect/Request.makeEntry`        |  594 | `root-declaration` | **recommended** |
| `effect/Request.Entry`            |  568 | `root-declaration` | **optional**    |
| `effect/Request.Any`              |   71 | `root-declaration` | **optional**    |
| `effect/Request.Services`         |  178 | `root-declaration` | **optional**    |
| `effect/Request.Variance`         |   84 | `root-declaration` | **discouraged** |
| `effect/Request.RequestPrototype` |  227 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Request.complete`

- **Source:** `packages/effect/src/Request.ts:436`
- **Kind / category:** `root-declaration` / `completion`
- **Priority:** **recommended**
- **Current description:** Completes a request entry with the provided result.
- **Signature hint:** `declare function complete<A extends Any>(result: Result<A>): (self: Entry<A>) => Effect.Effect<void> declare function complete<A extends Any>(self: Entry<A>, result: Result<A>): Effect.Effect<void>`
- **Import guidance:** Start from `import { Request } from "effect"` and use `Request.complete`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Request.complete`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Request.completeEffect`

- **Source:** `packages/effect/src/Request.ts:470`
- **Kind / category:** `root-declaration` / `completion`
- **Priority:** **recommended**
- **Current description:** Completes a request entry with the result of an effect.
- **Signature hint:** `declare function completeEffect<A extends Any, R>(effect: Effect.Effect<Success<A>, Error<A>, R>): (self: Entry<A>) => Effect.Effect<void, never, R> declare function completeEffect<A extends Any, R>(self: Entry<A>, effect: Effect.Effect<Success<A>, Error<A>, R>): Effect.Effect<void, never, R>`
- **Import guidance:** Start from `import { Request } from "effect"` and use `Request.completeEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Request.completeEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Request.fail`

- **Source:** `packages/effect/src/Request.ts:498`
- **Kind / category:** `root-declaration` / `completion`
- **Priority:** **recommended**
- **Current description:** Completes a request entry with a typed failure.
- **Signature hint:** `declare function fail<A extends Any>(error: Error<A>): (self: Entry<A>) => Effect.Effect<void> declare function fail<A extends Any>(self: Entry<A>, error: Error<A>): Effect.Effect<void>`
- **Import guidance:** Start from `import { Request } from "effect"` and use `Request.fail`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Request.fail`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Request.failCause`

- **Source:** `packages/effect/src/Request.ts:522`
- **Kind / category:** `root-declaration` / `completion`
- **Priority:** **recommended**
- **Current description:** Completes a request entry with a failure `Cause`.
- **Signature hint:** `declare function failCause<A extends Any>(cause: Cause.Cause<Error<A>>): (self: Entry<A>) => Effect.Effect<void> declare function failCause<A extends Any>(self: Entry<A>, cause: Cause.Cause<Error<A>>): Effect.Effect<void>`
- **Import guidance:** Start from `import { Request } from "effect"` and use `Request.failCause`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Request.failCause`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Request.succeed`

- **Source:** `packages/effect/src/Request.ts:547`
- **Kind / category:** `root-declaration` / `completion`
- **Priority:** **recommended**
- **Current description:** Completes a request entry successfully with the supplied value.
- **Signature hint:** `declare function succeed<A extends Any>(value: Success<A>): (self: Entry<A>) => Effect.Effect<void> declare function succeed<A extends Any>(self: Entry<A>, value: Success<A>): Effect.Effect<void>`
- **Import guidance:** Start from `import { Request } from "effect"` and use `Request.succeed`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Request.succeed`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Request.makeEntry`

- **Source:** `packages/effect/src/Request.ts:594`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **recommended**
- **Current description:** Creates a `Request.Entry` from its component fields.
- **Signature hint:** `declare function makeEntry<R>(options: { readonly request: R; readonly context: Context.Context<[R] extends [Request<infer _A, infer _E, infer _R>] ? _R : never>; readonly uninterruptible: boolean; readonly completeUnsafe: (exit: Exit.Exit<[R] extends [Request<infer _A, infer _E, infer _R>] ? _A : never, [R] extends [Request<infer _A, infer _E, infer _R>] ? _E : never>) => void; }): Entry<R>`
- **Import guidance:** Start from `import { Request } from "effect"` and use `Request.makeEntry`.
- **Suggested snippet:** Construct one representative value with `Request.makeEntry`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Request.Entry`

- **Source:** `packages/effect/src/Request.ts:568`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **optional**
- **Current description:** A pending request handed to a `RequestResolver`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Request.Entry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Request.Any`

- **Source:** `packages/effect/src/Request.ts:71`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Alias for any `Request`, regardless of its success, error, or service requirements.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Request.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Request.Services`

- **Source:** `packages/effect/src/Request.ts:178`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the requirements type from a `Request`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Request.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Request.Variance`

- **Source:** `packages/effect/src/Request.ts:84`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Variance marker carried by every `Request`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Request.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Request.RequestPrototype`

- **Source:** `packages/effect/src/Request.ts:227`
- **Kind / category:** `root-declaration` / `prototypes`
- **Priority:** **discouraged**
- **Current description:** Prototype used by Effect's request constructors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Request } from "effect"` and use `Request.RequestPrototype`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Request.RequestPrototype` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
