# Example Suggestions: `effect/unstable/http/Template`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/Template.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 2 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind                    | Priority        |
| ---------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/http/Template.make`                       |  116 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Template.stream`                     |  177 | `root-declaration`      | **recommended** |
| `effect/unstable/http/Template.PrimitiveValue`             |   22 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Template.Primitive`                  |   35 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Template.Interpolated (type) (type)` |   48 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Template.InterpolatedWithStream`     |   64 | `root-declaration`      | **optional**    |
| `effect/unstable/http/Template.Interpolated (type) (type)` |   71 | `namespace`             | **optional**    |
| `effect/unstable/http/Template.Interpolated.Context`       |   82 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/Template.Interpolated.Error`         |   98 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/Template.make`

- **Source:** `packages/effect/src/unstable/http/Template.ts:116`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an effectful string from a template literal.
- **Signature hint:** `declare function make<A extends ReadonlyArray<Interpolated>>(strings: TemplateStringsArray, ...args: A): Effect.Effect<string, Interpolated.Error<A[number]>, Interpolated.Context<A[number]>>`
- **Import guidance:** Start from `import { Template } from "effect/unstable/http"` and use `Template.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Template.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/Template.stream`

- **Source:** `packages/effect/src/unstable/http/Template.ts:177`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a stream of strings from a template literal.
- **Signature hint:** `declare function stream<A extends ReadonlyArray<InterpolatedWithStream>>(strings: TemplateStringsArray, ...args: A): Stream.Stream<string, Interpolated.Error<A[number]>, Interpolated.Context<A[number]>>`
- **Import guidance:** Start from `import { Template } from "effect/unstable/http"` and use `Template.stream`.
- **Suggested snippet:** Create a finite stream, apply `Template.stream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/Template.PrimitiveValue`

- **Source:** `packages/effect/src/unstable/http/Template.ts:22`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Primitive value that can be interpolated into an HTTP template.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Template.PrimitiveValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Template.Primitive`

- **Source:** `packages/effect/src/unstable/http/Template.ts:35`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Primitive template interpolation value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Template.Primitive`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Template.Interpolated (type) (type)`

- **Source:** `packages/effect/src/unstable/http/Template.ts:48`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Value accepted by the string template constructor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Template.Interpolated (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Template.InterpolatedWithStream`

- **Source:** `packages/effect/src/unstable/http/Template.ts:64`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Value accepted by the streaming template constructor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Template.InterpolatedWithStream`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Template.Interpolated (type) (type)`

- **Source:** `packages/effect/src/unstable/http/Template.ts:71`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level helpers for template interpolations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Template.Interpolated (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Template.Interpolated.Context`

- **Source:** `packages/effect/src/unstable/http/Template.ts:82`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the required context from an effect or stream interpolation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Template.Interpolated.Context`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/Template.Interpolated.Error`

- **Source:** `packages/effect/src/unstable/http/Template.ts:98`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error type from an effect or stream interpolation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/Template.Interpolated.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
