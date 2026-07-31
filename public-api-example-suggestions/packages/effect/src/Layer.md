# Example Suggestions: `effect/Layer`

- **Package:** `effect`
- **Source:** `packages/effect/src/Layer.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 6 recommended, 11 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                              | Line | Kind               | Priority        |
| -------------------------------- | ---: | ------------------ | --------------- |
| `effect/Layer.forkMemoMap`       |  562 | `root-declaration` | **recommended** |
| `effect/Layer.tap`               | 1699 | `root-declaration` | **recommended** |
| `effect/Layer.tapError`          | 1738 | `root-declaration` | **recommended** |
| `effect/Layer.tapCause`          | 1778 | `root-declaration` | **recommended** |
| `effect/Layer.catch`             | 1880 | `root-declaration` | **recommended** |
| `effect/Layer.updateService`     | 2060 | `root-declaration` | **recommended** |
| `effect/Layer.PartialEffectful`  | 2227 | `root-declaration` | **optional**    |
| `effect/Layer.SpanOptions`       | 2473 | `root-declaration` | **optional**    |
| `effect/Layer.Layer`             |   54 | `root-declaration` | **optional**    |
| `effect/Layer.LayerUnify`        |   74 | `root-declaration` | **optional**    |
| `effect/Layer.LayerUnifyIgnore`  |   90 | `root-declaration` | **optional**    |
| `effect/Layer.Any`               |  127 | `root-declaration` | **optional**    |
| `effect/Layer.Services`          |  148 | `root-declaration` | **optional**    |
| `effect/Layer.Error`             |  165 | `root-declaration` | **optional**    |
| `effect/Layer.Success`           |  180 | `root-declaration` | **optional**    |
| `effect/Layer.CurrentMemoMap`    |  582 | `root-declaration` | **optional**    |
| `effect/Layer.SpanOptions.onEnd` | 2478 | `member`           | **optional**    |
| `effect/Layer.forkMemoMapUnsafe` |  509 | `root-declaration` | **discouraged** |
| `effect/Layer.Variance`          |   98 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Layer.forkMemoMap`

- **Source:** `packages/effect/src/Layer.ts:562`
- **Kind / category:** `root-declaration` / `memo map`
- **Priority:** **recommended**
- **Current description:** Constructs a child `MemoMap` effectfully, allowing it to reuse layers already memoized in the parent while isolating any new layer allocations to the child map.
- **Signature hint:** `declare function forkMemoMap(parent: MemoMap): Effect<MemoMap>`
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.forkMemoMap`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Layer.forkMemoMap`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Layer.tap`

- **Source:** `packages/effect/src/Layer.ts:1699`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Performs the specified effect if this layer succeeds.
- **Signature hint:** `declare function tap<ROut, XR extends ROut, RIn2, E2, X>(f: (context: Context.Context<XR>) => Effect<X, E2, RIn2>): <RIn, E>(self: Layer<ROut, E, RIn>) => Layer<ROut, E | E2, RIn | Exclude<RIn2, Scope.Scope>> declare function tap<RIn, E, ROut, XR extends ROut, RIn2, E2, X>(self: Layer<ROut, E, RIn>, f: (context: Context.Context<XR>) => Effect<X, E2, RIn2>): Layer<ROut, E | E2, RIn | Exclude<RIn2, Scope.Scope>>`
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.tap`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Performs the specified effect if this layer succeeds. Call `Layer.tap` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Layer.tapError`

- **Source:** `packages/effect/src/Layer.ts:1738`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Performs the specified effect if this layer fails.
- **Signature hint:** `declare function tapError<E, XE extends E, RIn2, E2, X>(f: (e: XE) => Effect<X, E2, RIn2>): <RIn, ROut>(self: Layer<ROut, E, RIn>) => Layer<ROut, E | E2, RIn | Exclude<RIn2, Scope.Scope>> declare function tapError<RIn, E, XE extends E, ROut, RIn2, E2, X>(self: Layer<ROut, E, RIn>, f: (e: XE) => Effect<X, E2, RIn2>): Layer<ROut, E | E2, RIn | Exclude<RIn2, Scope.Scope>>`
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.tapError`.
- **Suggested snippet:** Create or capture `Layer.tapError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Layer.tapCause`

- **Source:** `packages/effect/src/Layer.ts:1778`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Performs the specified effect when this layer fails with any cause.
- **Signature hint:** `declare function tapCause<E, XE extends E, RIn2, E2, X>(f: (cause: Cause.Cause<XE>) => Effect<X, E2, RIn2>): <RIn, ROut>(self: Layer<ROut, E, RIn>) => Layer<ROut, E | E2, RIn | Exclude<RIn2, Scope.Scope>> declare function tapCause<RIn, E, XE extends E, ROut, RIn2, E2, X>(self: Layer<ROut, E, RIn>, f: (cause: Cause.Cause<XE>) => Effect<X, E2, RIn2>): Layer<ROut, E | E2, RIn | Exclude<RIn2, Scope.Scope>>`
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.tapCause`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Performs the specified effect when this layer fails with any cause. Call `Layer.tapCause` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Layer.catch`

- **Source:** `packages/effect/src/Layer.ts:1880`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from all typed errors by switching to another layer.
- **Signature hint:** `declare const _catch: { <E, RIn2, E2, ROut2>(onError: (error: E) => Layer<ROut2, E2, RIn2>): <RIn, ROut>(self: Layer<ROut, E, RIn>) => Layer<ROut & ROut2, E2, RIn2 | RIn>; <RIn, E, ROut, RIn2, E2, ROut2>(self: Layer<ROut, E, RIn>, onError: (error: E) => Layer<ROut2, E2, RIn2>): Layer<ROut & ROut2, E2, RIn | RIn2>; } export { _catch as catch }`
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.catch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Recovers from all typed errors by switching to another layer. Call `Layer.catch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Layer.updateService`

- **Source:** `packages/effect/src/Layer.ts:2060`
- **Kind / category:** `root-declaration` / `providing services`
- **Priority:** **recommended**
- **Current description:** Updates a service in the context with a new implementation.
- **Signature hint:** `declare function updateService<I, A>(service: Context.Key<I, A>, f: (a: Types.NoInfer<A>) => A): <A1, E1, R1>(layer: Layer<A1, E1, R1>) => Layer<A1, E1, I | R1> declare function updateService<A1, E1, R1, I, A>(layer: Layer<A1, E1, R1>, service: Context.Key<I, A>, f: (a: Types.NoInfer<A>) => A): Layer<A1, E1, I | R1>`
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.updateService`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates a service in the context with a new implementation. Call `Layer.updateService` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Layer.PartialEffectful`

- **Source:** `packages/effect/src/Layer.ts:2227`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** A utility type for creating partial mocks of services in testing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.PartialEffectful`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.SpanOptions`

- **Source:** `packages/effect/src/Layer.ts:2473`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents options that can be used to control the behavior of spans created for layers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.SpanOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.Layer`

- **Source:** `packages/effect/src/Layer.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `Layer` describes how to build one or more services for dependency injection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.Layer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.LayerUnify`

- **Source:** `packages/effect/src/Layer.ts:74`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level hook that allows `Layer` values to participate in `Unify` inference.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.LayerUnify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.LayerUnifyIgnore`

- **Source:** `packages/effect/src/Layer.ts:90`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level marker used by `Unify` for `Layer` types that should be ignored during unification.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.LayerUnifyIgnore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.Any`

- **Source:** `packages/effect/src/Layer.ts:127`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A type-level constraint for working with any `Layer` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.Services`

- **Source:** `packages/effect/src/Layer.ts:148`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the service requirements (`RIn`) from a `Layer` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.Error`

- **Source:** `packages/effect/src/Layer.ts:165`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the error type (`E`) from a `Layer` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.Success`

- **Source:** `packages/effect/src/Layer.ts:180`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the service output type (`ROut`) from a `Layer` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Layer.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.CurrentMemoMap`

- **Source:** `packages/effect/src/Layer.ts:582`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context service for the current `MemoMap` used in layer construction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.CurrentMemoMap`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Layer.CurrentMemoMap`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Layer.SpanOptions.onEnd`

- **Source:** `packages/effect/src/Layer.ts:2478`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Runs when the span associated with the layer ends, which happens when the layer scope is closed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Layer.SpanOptions.onEnd` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Layer.forkMemoMapUnsafe`

- **Source:** `packages/effect/src/Layer.ts:509`
- **Kind / category:** `root-declaration` / `memo map`
- **Priority:** **discouraged**
- **Current description:** Constructs a child `MemoMap` synchronously, allowing it to reuse layers already memoized in the parent while isolating any new layer allocations to the child map.
- **Signature hint:** `declare function forkMemoMapUnsafe(parent: MemoMap): MemoMap`
- **Import guidance:** Start from `import { Layer } from "effect"` and use `Layer.forkMemoMapUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Layer.forkMemoMapUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Layer.Variance`

- **Source:** `packages/effect/src/Layer.ts:98`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** The variance interface for Layer type parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Layer.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
