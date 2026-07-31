# Example Suggestions: `effect/Cause`

- **Package:** `effect`
- **Source:** `packages/effect/src/Cause.ts`
- **Uncovered API records:** 18
- **Priorities:** 1 required, 1 recommended, 7 optional, 9 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                        | Line | Kind                    | Priority        |
| ------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/Cause.InterruptorStackTrace`       | 1888 | `root-declaration`      | **required**    |
| `effect/Cause.StackTrace`                  | 1866 | `root-declaration`      | **recommended** |
| `effect/Cause.Done (value)`                | 1338 | `root-declaration`      | **optional**    |
| `effect/Cause.Cause`                       |  229 | `namespace`             | **optional**    |
| `effect/Cause.Cause.ReasonProto`           |  260 | `namespace-declaration` | **optional**    |
| `effect/Cause.Reason`                      |  275 | `namespace`             | **optional**    |
| `effect/Cause.Done (type)`                 | 1307 | `namespace`             | **optional**    |
| `effect/Cause.Done.Extract`                | 1315 | `namespace-declaration` | **optional**    |
| `effect/Cause.Done.Only`                   | 1323 | `namespace-declaration` | **optional**    |
| `effect/Cause.TypeId`                      |   31 | `root-declaration`      | **discouraged** |
| `effect/Cause.ReasonTypeId`                |   39 | `root-declaration`      | **discouraged** |
| `effect/Cause.NoSuchElementErrorTypeId`    | 1173 | `root-declaration`      | **discouraged** |
| `effect/Cause.DoneTypeId`                  | 1258 | `root-declaration`      | **discouraged** |
| `effect/Cause.TimeoutErrorTypeId`          | 1371 | `root-declaration`      | **discouraged** |
| `effect/Cause.IllegalArgumentErrorTypeId`  | 1438 | `root-declaration`      | **discouraged** |
| `effect/Cause.ExceededCapacityErrorTypeId` | 1522 | `root-declaration`      | **discouraged** |
| `effect/Cause.AsyncFiberErrorTypeId`       | 1584 | `root-declaration`      | **discouraged** |
| `effect/Cause.UnknownErrorTypeId`          | 1673 | `root-declaration`      | **discouraged** |

## Required

### `effect/Cause.InterruptorStackTrace`

- **Source:** `packages/effect/src/Cause.ts:1888`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **required**
- **Current description:** Context annotation used to store the stack frame captured at the point of interruption.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.InterruptorStackTrace`.
- **Suggested snippet:** Apply `Cause.InterruptorStackTrace` to the smallest representative input and assert the returned `Cause` with a semantic constructor or stable projection rather than rendered output.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/Cause.StackTrace`

- **Source:** `packages/effect/src/Cause.ts:1866`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **recommended**
- **Current description:** Context annotation used to store the stack frame captured at the point of failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.StackTrace`.
- **Suggested snippet:** Consume `Cause.StackTrace` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Cause.Done (value)`

- **Source:** `packages/effect/src/Cause.ts:1338`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Done` signal with an optional value.
- **Signature hint:** `declare function Done<A = void>(value?: A): Done<A>`
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.Done`.
- **Suggested snippet:** Apply `Cause.Done` to the smallest representative input and assert the returned `Cause` with a semantic constructor or stable projection rather than rendered output.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Cause.Cause`

- **Source:** `packages/effect/src/Cause.ts:229`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace for the `Cause` interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Cause.Cause`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Cause.Cause.ReasonProto`

- **Source:** `packages/effect/src/Cause.ts:260`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base interface shared by all reason types (`Fail`, `Die`, `Interrupt`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Cause.Cause.ReasonProto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Cause.Reason`

- **Source:** `packages/effect/src/Cause.ts:275`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace for the `Reason` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Cause.Reason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Cause.Done (type)`

- **Source:** `packages/effect/src/Cause.ts:1307`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace for the `Done` interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Cause.Done`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Cause.Done.Extract`

- **Source:** `packages/effect/src/Cause.ts:1315`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the value type `A` from a `Done<A>` that may be nested in an error union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Cause.Done.Extract`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Cause.Done.Only`

- **Source:** `packages/effect/src/Cause.ts:1323`
- **Kind / category:** `namespace-declaration` / `filtering`
- **Priority:** **optional**
- **Current description:** Filters a type union to only keep `Done` members.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Cause.Done.Only`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Cause.TypeId`

- **Source:** `packages/effect/src/Cause.ts:31`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `Cause` values, used for runtime type checks via `isCause`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.ReasonTypeId`

- **Source:** `packages/effect/src/Cause.ts:39`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `Reason` values, used for runtime type checks via `isReason`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.ReasonTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.NoSuchElementErrorTypeId`

- **Source:** `packages/effect/src/Cause.ts:1173`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `NoSuchElementError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.NoSuchElementErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.NoSuchElementErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.DoneTypeId`

- **Source:** `packages/effect/src/Cause.ts:1258`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `Done` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.DoneTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.DoneTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.TimeoutErrorTypeId`

- **Source:** `packages/effect/src/Cause.ts:1371`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `TimeoutError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.TimeoutErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.TimeoutErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.IllegalArgumentErrorTypeId`

- **Source:** `packages/effect/src/Cause.ts:1438`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `IllegalArgumentError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.IllegalArgumentErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.IllegalArgumentErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.ExceededCapacityErrorTypeId`

- **Source:** `packages/effect/src/Cause.ts:1522`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `ExceededCapacityError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.ExceededCapacityErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.ExceededCapacityErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.AsyncFiberErrorTypeId`

- **Source:** `packages/effect/src/Cause.ts:1584`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand present on `AsyncFiberError` values and used by `isAsyncFiberError` for runtime checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.AsyncFiberErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.AsyncFiberErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Cause.UnknownErrorTypeId`

- **Source:** `packages/effect/src/Cause.ts:1673`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique brand for `UnknownError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Cause } from "effect"` and use `Cause.UnknownErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Cause.UnknownErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
